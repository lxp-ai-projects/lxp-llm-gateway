import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { GlobalRole, TenantRole } from '@lxp/domain';
import { Repository } from 'typeorm';

import { RoleEntity } from '../persistence/entities/role.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { UserRoleEntity } from '../persistence/entities/user-role.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { EmailProtectionService } from '../security/email-protection.service';
import { PasswordService } from '../security/password.service';
import {
  type AuthenticatedUser,
  type AuthTokenPayload,
  type TokenPair,
} from './auth.types';
import { AuthTokenStore } from './auth-token.store';

@Injectable()
export class AuthService {
  private readonly accessTokenTtlSeconds = 5 * 60;
  private readonly refreshTokenTtlSeconds = 2 * 60 * 60;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly tenantMembershipRepository: Repository<TenantMembershipEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    private readonly emailProtectionService: EmailProtectionService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly authTokenStore: AuthTokenStore,
  ) {}

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await this.passwordService.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const authContext = await this.resolveActiveTenantAccess(user);
    return await this.issueTokenPair(user, authContext);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyToken(refreshToken, 'refresh');
    await this.assertRefreshTokenIsUsable(payload);

    const user = await this.userRepository.findOne({
      where: { emailHash: payload.emailHash },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    await this.authTokenStore.blacklistToken(
      payload.jti,
      this.refreshTokenTtlSeconds,
    );

    const authContext = await this.resolveActiveTenantAccess(
      user,
      payload.activeTenantId,
    );
    return this.issueTokenPair(user, authContext, payload.sessionId);
  }

  async logout(
    accessToken: string | undefined,
    refreshToken: string | undefined,
  ): Promise<void> {
    const accessPayload = accessToken
      ? await this.tryVerifyToken(accessToken, 'access')
      : null;
    const refreshPayload = refreshToken
      ? await this.tryVerifyToken(refreshToken, 'refresh')
      : null;

    if (accessPayload) {
      await this.authTokenStore.blacklistToken(
        accessPayload.jti,
        this.accessTokenTtlSeconds,
      );
    }

    if (refreshPayload) {
      await this.authTokenStore.blacklistToken(
        refreshPayload.jti,
        this.refreshTokenTtlSeconds,
      );
      await this.authTokenStore.deleteRefreshSession(refreshPayload.sessionId);
    }
  }

  async getAuthenticatedUser(accessToken: string): Promise<AuthenticatedUser> {
    const payload = await this.verifyToken(accessToken, 'access');
    const isBlacklisted = await this.authTokenStore.isTokenBlacklisted(
      payload.jti,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    const user = await this.userRepository.findOne({
      where: { emailHash: payload.emailHash },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    const authContext = await this.resolveActiveTenantAccess(
      user,
      payload.activeTenantId,
    );
    return this.mapAuthenticatedUser(user, authContext);
  }

  getRefreshTokenTtlSeconds(): number {
    return this.refreshTokenTtlSeconds;
  }

  private async issueTokenPair(
    user: UserEntity,
    authContext: {
      activeTenantId: string;
      activeTenantSlug: string;
      roles: TenantRole[];
      globalRoles: GlobalRole[];
    },
    sessionId: string = randomUUID(),
  ): Promise<TokenPair> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.emailHash,
        userId: user.id,
        emailHash: user.emailHash,
        activeTenantId: authContext.activeTenantId,
        activeTenantSlug: authContext.activeTenantSlug,
        type: 'access',
        roles: authContext.roles,
        globalRoles: authContext.globalRoles,
        sessionId,
        jti: accessJti,
      } satisfies AuthTokenPayload,
      {
        expiresIn: this.accessTokenTtlSeconds,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.emailHash,
        userId: user.id,
        emailHash: user.emailHash,
        activeTenantId: authContext.activeTenantId,
        activeTenantSlug: authContext.activeTenantSlug,
        type: 'refresh',
        roles: authContext.roles,
        globalRoles: authContext.globalRoles,
        sessionId,
        jti: refreshJti,
      } satisfies AuthTokenPayload,
      {
        expiresIn: this.refreshTokenTtlSeconds,
      },
    );

    await this.authTokenStore.setRefreshSession(
      sessionId,
      refreshJti,
      this.refreshTokenTtlSeconds,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async assertRefreshTokenIsUsable(
    payload: AuthTokenPayload,
  ): Promise<void> {
    const isBlacklisted = await this.authTokenStore.isTokenBlacklisted(
      payload.jti,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    const activeRefreshJti = await this.authTokenStore.getRefreshSession(
      payload.sessionId,
    );
    if (!activeRefreshJti || activeRefreshJti !== payload.jti) {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private async verifyToken(
    token: string,
    tokenType: 'access' | 'refresh',
  ): Promise<AuthTokenPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<AuthTokenPayload>(token);
      if (payload.type !== tokenType) {
        throw new UnauthorizedException('Unexpected token type.');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private async tryVerifyToken(
    token: string,
    tokenType: 'access' | 'refresh',
  ): Promise<AuthTokenPayload | null> {
    try {
      return await this.verifyToken(token, tokenType);
    } catch {
      return null;
    }
  }

  private async findUserByEmail(email: string): Promise<UserEntity | null> {
    const emailHash = this.emailProtectionService.protect(email).emailHash;
    return this.userRepository.findOne({
      where: { emailHash },
    });
  }

  private async getUserGlobalRoles(userId: string): Promise<GlobalRole[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: {
        role: true,
      },
    });

    return userRoles
      .map((userRole) => userRole.role?.name)
      .filter((roleName): roleName is GlobalRole => roleName === 'super_admin');
  }

  private async resolveActiveTenantAccess(
    user: UserEntity,
    requestedTenantId?: string,
  ): Promise<{
    activeTenantId: string;
    activeTenantSlug: string;
    roles: TenantRole[];
    globalRoles: GlobalRole[];
  }> {
    const globalRoles = await this.getUserGlobalRoles(user.id);
    const memberships = await this.tenantMembershipRepository.find({
      where: { userId: user.id },
      relations: {
        tenant: true,
      },
    });
    const activeMemberships = memberships.filter(
      (membership) => membership.tenant?.status === 'active',
    );
    if (!activeMemberships.length) {
      throw new UnauthorizedException(
        'No active tenant membership is available for this user.',
      );
    }

    const activeTenantId =
      requestedTenantId ?? user.lastActiveTenantId ?? activeMemberships[0].tenantId;
    const tenant = await this.tenantRepository.findOne({
      where: {
        id: activeTenantId,
        status: 'active',
      },
    });
    if (!tenant) {
      throw new UnauthorizedException('Active tenant not found for session.');
    }

    const tenantRoles = activeMemberships
      .filter((membership) => membership.tenantId === tenant.id)
      .map((membership) => membership.role);
    if (!tenantRoles.length && !globalRoles.includes('super_admin')) {
      throw new UnauthorizedException(
        'User is not a member of the active tenant.',
      );
    }

    if (user.lastActiveTenantId !== tenant.id) {
      user.lastActiveTenantId = tenant.id;
      await this.userRepository.save(user);
    }

    return {
      activeTenantId: tenant.id,
      activeTenantSlug: tenant.slug,
      roles: tenantRoles,
      globalRoles,
    };
  }

  private mapAuthenticatedUser(
    user: UserEntity,
    authContext: {
      activeTenantId: string;
      activeTenantSlug: string;
      roles: TenantRole[];
      globalRoles: GlobalRole[];
    },
  ): AuthenticatedUser {
    return {
      userId: user.id,
      userUuid: user.userUuid,
      email: this.emailProtectionService.reveal({
        emailHash: user.emailHash,
        encryptedEmail: user.encryptedEmail,
        emailIv: user.emailIv,
        emailAuthTag: user.emailAuthTag,
        emailKeyVersion: user.emailKeyVersion,
      }),
      displayName: user.displayName,
      status: user.status,
      activeTenantId: authContext.activeTenantId,
      activeTenantSlug: authContext.activeTenantSlug,
      roles: authContext.roles,
      globalRoles: authContext.globalRoles,
    };
  }
}
