import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from '../persistence/entities/user.entity';
import type { GatewayAuthContext, GatewayAuthTokenPayload } from './auth.types';

@Injectable()
export class GatewayAuthService {
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
      userId: user.id,
      userUuid: user.userUuid,
      emailHash: user.emailHash,
      roles: payload.roles,
      defaultProviderId: user.defaultProviderId,
      defaultModel: user.defaultModel,
    };
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
}
