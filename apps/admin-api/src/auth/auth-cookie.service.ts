import type { Response } from 'express';
import { Inject, Injectable, Optional } from '@nestjs/common';

export const AUTH_COOKIE_SERVICE_CONFIG = Symbol('AUTH_COOKIE_SERVICE_CONFIG');

export type AuthCookieServiceConfig = {
  adminWebOrigin?: string;
  cookieDomain?: string;
  secureCookies?: boolean;
};

@Injectable()
export class AuthCookieService {
  private readonly accessCookieName = 'lxp_access_token';
  private readonly refreshCookieName = 'lxp_refresh_token';
  private readonly cookieDomain: string | undefined;
  private readonly secureCookies: boolean;

  constructor(
    @Optional()
    @Inject(AUTH_COOKIE_SERVICE_CONFIG)
    private readonly config?: AuthCookieServiceConfig,
  ) {
    this.cookieDomain = this.resolveCookieDomain();
    this.secureCookies = this.resolveSecureCookies();
  }

  setAccessTokenCookie(
    response: Response,
    token: string,
    maxAgeMs: number,
  ): void {
    response.cookie(this.accessCookieName, token, {
      ...this.buildCookieOptions('/'),
      maxAge: maxAgeMs,
    });
  }

  setRefreshTokenCookie(
    response: Response,
    token: string,
    maxAgeMs: number,
  ): void {
    response.cookie(this.refreshCookieName, token, {
      ...this.buildCookieOptions('/api/v1/auth'),
      maxAge: maxAgeMs,
    });
  }

  clearAccessTokenCookie(response: Response): void {
    response.clearCookie(
      this.accessCookieName,
      this.buildCookieOptions('/'),
    );
  }

  clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(
      this.refreshCookieName,
      this.buildCookieOptions('/api/v1/auth'),
    );
  }

  getRefreshTokenCookieName(): string {
    return this.refreshCookieName;
  }

  getAccessTokenCookieName(): string {
    return this.accessCookieName;
  }

  private buildCookieOptions(path: string) {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.secureCookies,
      path,
      domain: this.cookieDomain,
    };
  }

  private resolveCookieDomain(): string | undefined {
    const configuredDomain =
      this.config?.cookieDomain?.trim() ?? process.env.LXP_COOKIE_DOMAIN?.trim();
    return configuredDomain ? configuredDomain : undefined;
  }

  private resolveSecureCookies(): boolean {
    if (this.config?.secureCookies !== undefined) {
      return this.config.secureCookies;
    }

    const configuredSecure = process.env.LXP_COOKIE_SECURE?.trim().toLowerCase();
    if (configuredSecure === 'true') {
      return true;
    }
    if (configuredSecure === 'false') {
      return false;
    }

    const adminWebOrigin = (
      this.config?.adminWebOrigin ?? process.env.ADMIN_WEB_ORIGIN
    )
      ?.trim()
      .toLowerCase();
    return adminWebOrigin?.startsWith('https://') ?? false;
  }
}
