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
import type { GatewayAuthContext, GatewayAuthTokenPayload } from './auth.types';

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
      ...this.mapUserToAuthContext(user),
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
      if (debugEnabled) {
        this.logger.debug(
          `OpenAI-compatible trusted user resolved: userUuid=${authContext.userUuid} emailHash=${authContext.emailHash.slice(0, 12)}...`,
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
        `OpenAI-compatible access-token user resolved: userUuid=${authContext.userUuid} emailHash=${authContext.emailHash.slice(0, 12)}...`,
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
    const email =
      this.readTrustedEmailHeader(requestHeaders) ??
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

    if (this.isOpenAiCompatDebugEnabled()) {
      this.logger.debug(
        `OpenAI-compatible trusted header email=${email} resolved userUuid=${user.userUuid}`,
      );
    }

    return {
      ...this.mapUserToAuthContext(user),
      roles: [],
    };
  }

  private readTrustedEmailHeader(
    requestHeaders?: Record<string, string | string[] | undefined>,
  ): string | undefined {
    const configuredHeader =
      process.env.LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER?.trim();
    if (!configuredHeader || !requestHeaders) {
      return undefined;
    }

    const headerValue = requestHeaders[configuredHeader.toLowerCase()];
    if (Array.isArray(headerValue)) {
      return headerValue[0]?.trim() || undefined;
    }

    return headerValue?.trim() || undefined;
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

  private mapUserToAuthContext(user: UserEntity): Omit<GatewayAuthContext, 'roles'> {
    return {
      userId: user.id,
      userUuid: user.userUuid,
      emailHash: user.emailHash,
      defaultProviderId: user.defaultProviderId,
      defaultModel: user.defaultModel,
      defaultImageProviderId: user.defaultImageProviderId,
      defaultImageModel: user.defaultImageModel,
    };
  }

  private isOpenAiCompatDebugEnabled(): boolean {
    return (process.env.LXP_OPENAI_COMPAT_DEBUG ?? '').toLowerCase() === 'true';
  }
}
