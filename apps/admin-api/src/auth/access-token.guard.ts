import type { ExecutionContext } from '@nestjs/common';
import { CanActivate, Injectable, UnauthorizedException } from '@nestjs/common';

import type { RequestWithAuthUser } from './auth-request.types';
import { AuthService } from './auth.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      RequestWithAuthUser & {
        headers?: Record<string, string | undefined>;
        cookies?: Record<string, string | undefined>;
      }
    >();
    const token = this.resolveAccessToken(request);
    request.authUser = await this.authService.getAuthenticatedUser(token);

    return true;
  }

  private resolveAccessToken(
    request: RequestWithAuthUser & {
      headers?: Record<string, string | undefined>;
      cookies?: Record<string, string | undefined>;
    },
  ): string {
    const cookieToken = request.cookies?.lxp_access_token;
    if (cookieToken) {
      return cookieToken;
    }

    return this.extractBearerToken(request.headers?.authorization);
  }

  private extractBearerToken(authorizationHeader?: string): string {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Access token is required.');
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
