import type { Request, Response } from 'express';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from './access-token.guard';
import type { RequestWithAuthUser } from './auth-request.types';
import { AuthCookieService } from './auth-cookie.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  private readonly accessTokenCookieMaxAgeMs = 5 * 60 * 1000;
  private readonly refreshTokenCookieMaxAgeMs = 2 * 60 * 60 * 1000;

  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password);
    this.authCookieService.setAccessTokenCookie(
      response,
      result.accessToken,
      this.accessTokenCookieMaxAgeMs,
    );
    this.authCookieService.setRefreshTokenCookie(
      response,
      result.refreshToken,
      this.refreshTokenCookieMaxAgeMs,
    );

    return result;
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      dto.refreshToken ??
      request.cookies?.[this.authCookieService.getRefreshTokenCookieName()];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const result = await this.authService.refresh(refreshToken);
    this.authCookieService.setAccessTokenCookie(
      response,
      result.accessToken,
      this.accessTokenCookieMaxAgeMs,
    );
    this.authCookieService.setRefreshTokenCookie(
      response,
      result.refreshToken,
      this.refreshTokenCookieMaxAgeMs,
    );

    return result;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Body() dto: LogoutDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('authorization') authorizationHeader?: string,
  ): Promise<void> {
    const accessToken = this.extractBearerToken(authorizationHeader);
    const refreshToken =
      dto.refreshToken ??
      request.cookies?.[this.authCookieService.getRefreshTokenCookieName()];
    await this.authService.logout(accessToken, refreshToken);
    this.authCookieService.clearAccessTokenCookie(response);
    this.authCookieService.clearRefreshTokenCookie(response);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@Req() request: Request & RequestWithAuthUser) {
    return request.authUser;
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
