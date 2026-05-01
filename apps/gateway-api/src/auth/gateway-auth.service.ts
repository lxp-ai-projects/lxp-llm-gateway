import { createHmac } from 'node:crypto';
import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from '../persistence/entities/user.entity';
import type {
  GatewayAuthContext,
  GatewayAuthIdentitySource,
  GatewayAuthTokenPayload,
} from './auth.types';

@Injectable()
export class GatewayAuthService {
  private readonly logger = new Logger(GatewayAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async authenticateAccessToken(
    authorizationHeader?: string,
    accessTokenCookie?: string,
  ): Promise<GatewayAuthContext> {
    const token =
      accessTokenCookie ?? this.extractBearerToken(authorizationHeader);
    if (!token) {
      throw new UnauthorizedException('Access token is required.');
    }

    const payload = await this.verifyAccessToken(token);
    const user = await this.userRepository.findOne({
      where: {
        emailHash: payload.emailHash,
        status: 'active',
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found for token.');
    }

    return {
      ...this.mapUserToAuthContext(user, 'access-token'),
      roles: payload.roles,
    };
  }

  async authenticateOpenAiCompatibleRequest(
    authorizationHeader?: string,
    accessTokenCookie?: string,
    requestHeaders?: Record<string, string | string[] | undefined>,
  ): Promise<GatewayAuthContext> {
    const bearerToken = this.tryExtractBearerToken(authorizationHeader);
    const configuredApiKey = process.env.LXP_OPENAI_COMPAT_API_KEY?.trim();
    const debugEnabled = this.isOpenAiCompatDebugEnabled();

    if (configuredApiKey && bearerToken === configuredApiKey) {
      const authContext = await this.authenticateTrustedOpenAiCompatibleUser(
        requestHeaders,
      );
      this.logCompatibilityRequestAccepted(authContext);
      if (debugEnabled) {
        this.logger.debug(
          `OpenAI-compatible trusted user resolved: userUuid=${authContext.userUuid} userFingerprint=${this.fingerprintEmailHash(authContext.emailHash)}`,
        );
      }
      return authContext;
    }

    const authContext = await this.authenticateAccessToken(
      authorizationHeader,
      accessTokenCookie,
    );
    if (debugEnabled) {
      this.logger.debug(
        `OpenAI-compatible access-token user resolved: userUuid=${authContext.userUuid} userFingerprint=${this.fingerprintEmailHash(authContext.emailHash)}`,
      );
    }
    return authContext;
  }

  private async verifyAccessToken(
    token: string,
  ): Promise<GatewayAuthTokenPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<GatewayAuthTokenPayload>(token);
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Access token is required.');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private extractBearerToken(authorizationHeader?: string): string | undefined {
    if (!authorizationHeader) {
      return undefined;
    }

    const [scheme, token] = authorizationHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException(
        'Authorization header must be a Bearer token.',
      );
    }

    return token;
  }

  private tryExtractBearerToken(
    authorizationHeader?: string,
  ): string | undefined {
    try {
      return this.extractBearerToken(authorizationHeader);
    } catch {
      return undefined;
    }
  }

  private async authenticateTrustedOpenAiCompatibleUser(
    requestHeaders?: Record<string, string | string[] | undefined>,
  ): Promise<GatewayAuthContext> {
    const trustedIdentity = this.readTrustedEmailHeader(requestHeaders);
    if (trustedIdentity && !this.isTrustedIdentityCorrelationEnabled()) {
      if (this.isOpenAiCompatDebugEnabled()) {
        this.logger.debug(
          'OpenAI-compatible trusted identity header rejected because trusted identity mode is disabled.',
        );
      }
      throw new UnauthorizedException(
        'Trusted OpenAI-compatible identity headers are not accepted in the current runtime mode.',
      );
    }

    const email =
      trustedIdentity?.email ??
      process.env.LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL?.trim();
    if (!email) {
      throw new UnauthorizedException(
        'OpenAI-compatible access requires a trusted user email header or LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL.',
      );
    }

    const user = await this.userRepository.findOne({
      where: {
        emailHash: this.computeEmailHash(email),
        status: 'active',
      },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Trusted OpenAI-compatible user not found for the configured email.',
      );
    }

    const identitySource: GatewayAuthIdentitySource = trustedIdentity
      ? 'openai-compatible-trusted-header'
      : 'openai-compatible-default-user';
    this.logCompatibilityIdentityResolved(
      user,
      identitySource,
      trustedIdentity?.headerName,
    );

    if (this.isOpenAiCompatDebugEnabled()) {
      const resolutionSource = trustedIdentity
        ? 'trusted-header'
        : 'default-user';
      this.logger.debug(
        `OpenAI-compatible identity source=${resolutionSource} trustedHeader=${trustedIdentity?.headerName ?? 'none'} userUuid=${user.userUuid} userFingerprint=${this.fingerprintEmailHash(user.emailHash)}`,
      );
    }

    return {
      ...this.mapUserToAuthContext(user, identitySource),
      roles: [],
    };
  }

  private readTrustedEmailHeader(
    requestHeaders?: Record<string, string | string[] | undefined>,
  ): { email: string; headerName: string } | undefined {
    const configuredHeaders = this.listTrustedEmailHeaders();
    if (!configuredHeaders.length || !requestHeaders) {
      return undefined;
    }

    const matches = configuredHeaders
      .map((headerName) => {
        const headerValue = requestHeaders[headerName.toLowerCase()];
        const value = Array.isArray(headerValue)
          ? headerValue[0]?.trim() || undefined
          : headerValue?.trim() || undefined;
        if (!value) {
          return undefined;
        }

        return {
          headerName,
          email: value,
        };
      })
      .filter(
        (
          match,
        ): match is {
          email: string;
          headerName: string;
        } => Boolean(match),
      );

    if (!matches.length) {
      return undefined;
    }

    const distinctEmails = new Set(
      matches.map((match) => match.email.trim().toLowerCase()),
    );
    if (distinctEmails.size > 1) {
      throw new UnauthorizedException(
        'Conflicting trusted identity headers were supplied for the OpenAI-compatible request.',
      );
    }

    return matches[0];
  }

  private listTrustedEmailHeaders(): string[] {
    const configuredHeaderList =
      process.env.LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS?.trim() ?? '';
    const configuredHeaders = configuredHeaderList
      .split(',')
      .map((header) => header.trim())
      .filter(Boolean);

    if (configuredHeaders.length) {
      return [...new Set(configuredHeaders)];
    }

    const legacyHeader =
      process.env.LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER?.trim();
    return legacyHeader ? [legacyHeader] : [];
  }

  private isTrustedIdentityCorrelationEnabled(): boolean {
    return (
      process.env.LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED ?? ''
    ).toLowerCase() === 'true';
  }

  private computeEmailHash(email: string): string {
    const encodedLookupKey = process.env.LXP_EMAIL_LOOKUP_KEY;
    if (!encodedLookupKey) {
      throw new UnauthorizedException(
        'LXP_EMAIL_LOOKUP_KEY is required for trusted OpenAI-compatible user resolution.',
      );
    }

    const lookupKey = Buffer.from(encodedLookupKey, 'base64');
    if (lookupKey.length !== 32) {
      throw new UnauthorizedException(
        'LXP_EMAIL_LOOKUP_KEY must be a base64-encoded 32-byte key.',
      );
    }

    return createHmac('sha256', lookupKey)
      .update(email.trim().toLowerCase())
      .digest('hex');
  }

  private mapUserToAuthContext(
    user: UserEntity,
    identitySource: GatewayAuthIdentitySource,
  ): Omit<GatewayAuthContext, 'roles'> {
    return {
      userId: user.id,
      userUuid: user.userUuid,
      emailHash: user.emailHash,
      identitySource,
      defaultProviderId: user.defaultProviderId,
      defaultModel: user.defaultModel,
      defaultImageProviderId: user.defaultImageProviderId,
      defaultImageModel: user.defaultImageModel,
    };
  }

  private logCompatibilityRequestAccepted(authContext: GatewayAuthContext): void {
    this.logger.log(
      JSON.stringify({
        event: 'gateway.compatibility.request.accepted',
        authMode: 'compatibility-api-key',
        identitySource: authContext.identitySource,
        resolvedUserUuid: authContext.userUuid,
        userFingerprint: this.fingerprintEmailHash(authContext.emailHash),
      }),
    );
  }

  private logCompatibilityIdentityResolved(
    user: Pick<UserEntity, 'userUuid' | 'emailHash'>,
    identitySource: Extract<
      GatewayAuthIdentitySource,
      'openai-compatible-default-user' | 'openai-compatible-trusted-header'
    >,
    trustedHeaderName?: string,
  ): void {
    this.logger.log(
      JSON.stringify({
        event: 'gateway.compatibility.identity.resolved',
        identitySource,
        trustedHeaderName: trustedHeaderName ?? null,
        resolvedUserUuid: user.userUuid,
        userFingerprint: this.fingerprintEmailHash(user.emailHash),
      }),
    );
  }

  private fingerprintEmailHash(emailHash: string): string {
    return emailHash.slice(0, 16);
  }

  private isOpenAiCompatDebugEnabled(): boolean {
    return (process.env.LXP_OPENAI_COMPAT_DEBUG ?? '').toLowerCase() === 'true';
  }
}
