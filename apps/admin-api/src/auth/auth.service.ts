import {randomUUID} from 'node:crypto';
import {ForbiddenException, Injectable, UnauthorizedException,} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';

import {UserRoleEntity} from '../persistence/entities/user-role.entity';
import {UserEntity} from '../persistence/entities/user.entity';
import {EmailProtectionService} from '../security/email-protection.service';
import {PasswordService} from '../security/password.service';
import {type AuthenticatedUser, type AuthTokenPayload, type TokenPair,} from './auth.types';
import {AuthTokenStore} from './auth-token.store';

@Injectable()
export class AuthService {
  private readonly accessTokenTtlSeconds = 5 * 60;
  private readonly refreshTokenTtlSeconds = 2 * 60 * 60;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
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
      throw new ForbiddenException('User account is not active.');
    }

    const passwordMatches = await this.passwordService.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const roles = await this.getUserRoles(user.id);
    return await this.issueTokenPair(user, roles);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyToken(refreshToken, 'refresh');
    await this.assertRefreshTokenIsUsable(payload);

    const user = await this.userRepository.findOne({
      where: { emailHash: payload.emailHash },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User is not available for refresh.');
    }

    const roles = await this.getUserRoles(user.id);
    await this.authTokenStore.blacklistToken(payload.jti, this.refreshTokenTtlSeconds);

    return this.issueTokenPair(user, roles, payload.sessionId);
  }

  async logout(accessToken: string | undefined, refreshToken: string | undefined): Promise<void> {
    const accessPayload = accessToken
      ? await this.tryVerifyToken(accessToken, 'access')
      : null;
    const refreshPayload = refreshToken
      ? await this.tryVerifyToken(refreshToken, 'refresh')
      : null;

    if (accessPayload) {
      await this.authTokenStore.blacklistToken(accessPayload.jti, this.accessTokenTtlSeconds);
    }

    if (refreshPayload) {
      await this.authTokenStore.blacklistToken(refreshPayload.jti, this.refreshTokenTtlSeconds);
      await this.authTokenStore.deleteRefreshSession(refreshPayload.sessionId);
    }
  }

  async getAuthenticatedUser(accessToken: string): Promise<AuthenticatedUser> {
    const payload = await this.verifyToken(accessToken, 'access');
    const isBlacklisted = await this.authTokenStore.isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Access token has been revoked.');
    }

    const user = await this.userRepository.findOne({
      where: { emailHash: payload.emailHash },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User is not available.');
    }

    return this.mapAuthenticatedUser(user, payload.roles);
  }

  getRefreshTokenTtlSeconds(): number {
    return this.refreshTokenTtlSeconds;
  }

  private async issueTokenPair(
    user: UserEntity,
    roles: string[],
    sessionId: string = randomUUID(),
  ): Promise<TokenPair> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.emailHash,
        emailHash: user.emailHash,
        type: 'access',
        roles,
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
        emailHash: user.emailHash,
        type: 'refresh',
        roles,
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

  private async assertRefreshTokenIsUsable(payload: AuthTokenPayload): Promise<void> {
    const isBlacklisted = await this.authTokenStore.isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked.');
    }

    const activeRefreshJti = await this.authTokenStore.getRefreshSession(payload.sessionId);
    if (!activeRefreshJti || activeRefreshJti !== payload.jti) {
      throw new UnauthorizedException('Refresh token is no longer active.');
    }
  }

  private async verifyToken(
    token: string,
    tokenType: 'access' | 'refresh',
  ): Promise<AuthTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token);
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

  private async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: {
        role: true,
      },
    });

    return userRoles
      .map((userRole) => userRole.role?.name)
      .filter((roleName): roleName is string => Boolean(roleName));
  }

  private mapAuthenticatedUser(user: UserEntity, roles: string[]): AuthenticatedUser {
    return {
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
      roles,
    };
  }
}
