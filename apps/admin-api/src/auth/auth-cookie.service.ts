import type { Response } from 'express';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthCookieService {
  private readonly refreshCookieName = 'lxp_refresh_token';

  setRefreshTokenCookie(response: Response, token: string, maxAgeMs: number): void {
    response.cookie(this.refreshCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/api/v1/auth',
      maxAge: maxAgeMs,
    });
  }

  clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(this.refreshCookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/api/v1/auth',
    });
  }

  getRefreshTokenCookieName(): string {
    return this.refreshCookieName;
  }
}
