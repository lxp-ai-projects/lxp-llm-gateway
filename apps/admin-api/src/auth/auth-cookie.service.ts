import type { Response } from 'express';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthCookieService {
  private readonly accessCookieName = 'lxp_access_token';
  private readonly refreshCookieName = 'lxp_refresh_token';

  setAccessTokenCookie(response: Response, token: string, maxAgeMs: number): void {
    response.cookie(this.accessCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: maxAgeMs,
    });
  }

  setRefreshTokenCookie(response: Response, token: string, maxAgeMs: number): void {
    response.cookie(this.refreshCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/api/v1/auth',
      maxAge: maxAgeMs,
    });
  }

  clearAccessTokenCookie(response: Response): void {
    response.clearCookie(this.accessCookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
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

  getAccessTokenCookieName(): string {
    return this.accessCookieName;
  }
}
