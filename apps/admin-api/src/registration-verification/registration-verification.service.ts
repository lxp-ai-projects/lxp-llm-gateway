import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  randomBytes,
  randomInt,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RegistrationVerificationChallengeEntity } from '../persistence/entities/registration-verification-challenge.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { EmailProtectionService } from '../security/email-protection.service';
import { TenantRegistrationService } from '../registration/tenant-registration.service';
import { VerificationDeliveryService } from './delivery/verification-delivery.service';
import { RegistrationVerificationRateLimitService } from './registration-verification-rate-limit.service';

const CODE_TTL_MS = 10 * 60_000;
const TOKEN_TTL_MS = 15 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;

@Injectable()
export class RegistrationVerificationService {
  constructor(
    @InjectRepository(RegistrationVerificationChallengeEntity)
    private readonly challenges: Repository<RegistrationVerificationChallengeEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
    private readonly registration: TenantRegistrationService,
    private readonly emailProtection: EmailProtectionService,
    private readonly delivery: VerificationDeliveryService,
    private readonly rateLimit: RegistrationVerificationRateLimitService,
  ) {}

  isEmailReady() {
    return this.delivery.isReady();
  }
  getDeliveryReadiness() {
    return this.delivery.getReadiness();
  }
  async sendConfiguredTest(tenantId: string) {
    const tenant = await this.tenants.findOneBy({
      id: tenantId,
      status: 'active',
    });
    const destination = process.env.LXP_REGISTRATION_EMAIL_TEST_RECIPIENT;
    if (!tenant || !destination || !this.delivery.isReady())
      throw new ServiceUnavailableException('Email delivery is unavailable.');
    await this.rateLimit.assertLimit('admin-test', tenantId, 3, 3600);
    await this.delivery.sendChallenge({
      tenantDisplayName: tenant.displayName,
      destination,
      code: '000000',
      expiresInMinutes: 1,
    });
    return { accepted: true };
  }

  async create(hostname: string | null, email: string, ip: string) {
    const tenant = await this.getReadyTenant(hostname);
    const protectedEmail = this.emailProtection.protect(email);
    await this.rateLimit.assertLimit('request:ip', ip, 20, 3600);
    await this.rateLimit.assertLimit('request:tenant', tenant.id, 100, 3600);
    await this.rateLimit.assertLimit(
      'request:destination',
      `${tenant.id}:${protectedEmail.emailHash}`,
      5,
      3600,
    );
    const now = new Date();
    const code = this.generateCode();
    const challenge = this.challenges.create({
      tenantId: tenant.id,
      channel: 'email',
      destinationHash: protectedEmail.emailHash,
      codeDigest: this.digest('code', code),
      purpose: 'registration',
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      resendAvailableAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
      verifiedAt: null,
      consumedAt: null,
      invalidatedAt: null,
      completionTokenDigest: null,
      completionTokenExpiresAt: null,
    });
    await this.challenges.save(challenge);
    try {
      await this.delivery.sendChallenge({
        tenantDisplayName: tenant.displayName,
        destination: email.trim().toLowerCase(),
        code,
        expiresInMinutes: 10,
      });
    } catch {
      await this.challenges.remove(challenge);
      throw new ServiceUnavailableException(
        'Email verification is temporarily unavailable.',
      );
    }
    return {
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt.toISOString(),
      resendAvailableAt: challenge.resendAvailableAt.toISOString(),
    };
  }

  async verify(challengeId: string, code: string, ip: string) {
    await this.rateLimit.assertLimit('verify:ip', ip, 20, 3600);
    await this.rateLimit.assertLimit('verify:challenge', challengeId, 5, 3600);
    const result = await this.challenges.manager.transaction(
      async (manager) => {
        const challenge = await manager
          .createQueryBuilder(
            RegistrationVerificationChallengeEntity,
            'challenge',
          )
          .setLock('pessimistic_write')
          .where('challenge.id = :challengeId', { challengeId })
          .getOne();
        const now = new Date();
        if (
          !challenge ||
          challenge.invalidatedAt ||
          challenge.verifiedAt ||
          challenge.expiresAt <= now ||
          challenge.attemptCount >= 5
        ) {
          return null;
        }
        challenge.attemptCount += 1;
        if (!this.matchesDigest('code', code, challenge.codeDigest)) {
          await manager.save(challenge);
          return null;
        }
        const completionToken = randomBytes(32).toString('base64url');
        challenge.verifiedAt = now;
        challenge.completionTokenDigest = this.digest(
          'completion',
          completionToken,
        );
        challenge.completionTokenExpiresAt = new Date(
          now.getTime() + TOKEN_TTL_MS,
        );
        await manager.save(challenge);
        return {
          completionToken,
          expiresAt: challenge.completionTokenExpiresAt.toISOString(),
        };
      },
    );
    if (!result) throw this.invalidChallenge();
    return result;
  }

  async resend(
    hostname: string | null,
    challengeId: string,
    email: string,
    ip: string,
  ) {
    const tenant = await this.getReadyTenant(hostname);
    const protectedEmail = this.emailProtection.protect(email);
    await this.rateLimit.assertLimit('resend:ip', ip, 20, 3600);
    await this.rateLimit.assertLimit('resend:tenant', tenant.id, 100, 3600);
    await this.rateLimit.assertLimit(
      'resend:destination',
      `${tenant.id}:${protectedEmail.emailHash}`,
      3,
      3600,
    );
    await this.rateLimit.assertLimit('resend:challenge', challengeId, 3, 3600);
    const challenge = await this.challenges.findOneBy({
      id: challengeId,
      tenantId: tenant.id,
    });
    const now = new Date();
    if (
      !challenge ||
      challenge.destinationHash !== protectedEmail.emailHash ||
      challenge.invalidatedAt ||
      challenge.verifiedAt ||
      challenge.expiresAt <= now ||
      challenge.resendCount >= 3 ||
      challenge.resendAvailableAt > now
    )
      throw this.invalidChallenge();
    const code = this.generateCode();
    const previousState = {
      codeDigest: challenge.codeDigest,
      resendCount: challenge.resendCount,
      resendAvailableAt: challenge.resendAvailableAt,
    };
    challenge.codeDigest = this.digest('code', code);
    challenge.resendCount += 1;
    challenge.resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_MS);
    await this.challenges.save(challenge);
    try {
      await this.delivery.sendChallenge({
        tenantDisplayName: tenant.displayName,
        destination: email.trim().toLowerCase(),
        code,
        expiresInMinutes: Math.max(
          1,
          Math.ceil((challenge.expiresAt.getTime() - now.getTime()) / 60_000),
        ),
      });
    } catch {
      challenge.codeDigest = previousState.codeDigest;
      challenge.resendCount = previousState.resendCount;
      challenge.resendAvailableAt = previousState.resendAvailableAt;
      await this.challenges.save(challenge);
      throw new ServiceUnavailableException(
        'Email verification is temporarily unavailable.',
      );
    }
    return {
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt.toISOString(),
      resendAvailableAt: challenge.resendAvailableAt.toISOString(),
    };
  }

  async consumeCompletionToken(challengeId: string, token: string) {
    return this.challenges.manager.transaction(async (manager) => {
      const challenge = await manager
        .createQueryBuilder(
          RegistrationVerificationChallengeEntity,
          'challenge',
        )
        .setLock('pessimistic_write')
        .where('challenge.id = :challengeId', { challengeId })
        .getOne();
      const now = new Date();
      if (
        !challenge ||
        !challenge.verifiedAt ||
        challenge.consumedAt ||
        !challenge.completionTokenDigest ||
        !challenge.completionTokenExpiresAt ||
        challenge.completionTokenExpiresAt <= now ||
        !this.matchesDigest(
          'completion',
          token,
          challenge.completionTokenDigest,
        )
      ) {
        return null;
      }
      challenge.consumedAt = now;
      await manager.save(challenge);
      return {
        tenantId: challenge.tenantId,
        destinationHash: challenge.destinationHash,
      };
    });
  }

  private async getReadyTenant(hostname: string | null) {
    const context = await this.registration.resolvePublicContext(hostname);
    if (
      !context.registrationEnabled ||
      !context.tenant ||
      !this.delivery.isReady()
    )
      throw new ServiceUnavailableException(
        'Email verification is unavailable.',
      );
    const tenant = await this.tenants.findOneBy({
      slug: context.tenant.slug,
      status: 'active',
    });
    if (!tenant)
      throw new ServiceUnavailableException(
        'Email verification is unavailable.',
      );
    return tenant;
  }
  private digest(purpose: string, value: string) {
    return createHmac(
      'sha256',
      Buffer.from(process.env.LXP_EMAIL_LOOKUP_KEY!, 'base64'),
    )
      .update(`${purpose}:${value}`)
      .digest('hex');
  }
  private matchesDigest(purpose: string, value: string, expected: string) {
    return timingSafeEqual(
      Buffer.from(this.digest(purpose, value), 'hex'),
      Buffer.from(expected, 'hex'),
    );
  }
  private generateCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }
  private invalidChallenge() {
    return new BadRequestException(
      'Verification challenge is invalid or expired.',
    );
  }
}
