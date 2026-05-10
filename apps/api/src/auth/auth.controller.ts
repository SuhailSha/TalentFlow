import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@repo/database';
import type { CookieOptions, Request, Response } from 'express';

import { AuthService, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { RequestUser, UserProfile } from './types/request-user.interface';

const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  // secure is set dynamically per-response based on NODE_ENV
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /api/v1/auth/login ───────────────────────────────────────────────

  @Public()
  @UseGuards(LocalAuthGuard) // triggers LocalStrategy → validateCredentials
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: Request & { user: User },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: UserProfile }> {
    const ipAddress = req.ip ?? req.socket.remoteAddress ?? '';
    const userAgent = req.headers['user-agent'] ?? '';

    const { accessToken, refreshToken, userProfile } = await this.authService.login(
      req.user,
      ipAddress,
      userAgent,
    );

    const isProduction = process.env['NODE_ENV'] === 'production';

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...BASE_COOKIE_OPTIONS,
      secure: isProduction,
      maxAge: 15 * 60 * 1_000, // 15 minutes — matches JWT_EXPIRES_IN
      path: '/',
    });

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...BASE_COOKIE_OPTIONS,
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60 * 1_000, // 30 days — matches JWT_REFRESH_EXPIRES_IN
      // Narrow path: refresh cookie only sent to auth endpoints (reduces attack surface)
      path: '/api/v1/auth',
    });

    return { user: userProfile };
  }

  // ── POST /api/v1/auth/refresh ─────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const rawRefreshToken: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (typeof rawRefreshToken !== 'string' || !rawRefreshToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No refresh token' });
      return { ok: true };
    }

    const ipAddress = req.ip ?? req.socket.remoteAddress ?? '';
    const userAgent = req.headers['user-agent'] ?? '';

    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      rawRefreshToken,
      ipAddress,
      userAgent,
    );

    const isProduction = process.env['NODE_ENV'] === 'production';

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...BASE_COOKIE_OPTIONS,
      secure: isProduction,
      maxAge: 15 * 60 * 1_000,
      path: '/',
    });

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...BASE_COOKIE_OPTIONS,
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60 * 1_000,
      path: '/api/v1/auth',
    });

    return { ok: true };
  }

  // ── POST /api/v1/auth/logout ──────────────────────────────────────────────

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const rawRefreshToken: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (typeof rawRefreshToken === 'string') {
      await this.authService.logout(rawRefreshToken);
    }

    const clearOptions: CookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
    };

    res.clearCookie(ACCESS_TOKEN_COOKIE, { ...clearOptions, path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { ...clearOptions, path: '/api/v1/auth' });

    return { ok: true };
  }

  // ── GET /api/v1/auth/me ───────────────────────────────────────────────────

  @Get('me')
  async getMe(@CurrentUser() user: RequestUser): Promise<{ user: UserProfile }> {
    const profile = await this.authService.getMe(user);
    return { user: profile };
  }
}
