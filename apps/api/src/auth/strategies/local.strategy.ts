import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import type { User } from '@repo/database';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';

/**
 * Validates email + password credentials at the login endpoint.
 *
 * `passReqToCallback: true` — gives access to the full request body so we can
 * read `organizationSlug` alongside the standard username/password fields.
 * This is necessary because passport-local only exposes two fields by default.
 *
 * On success, the returned User object is attached to req.user and passed to
 * AuthController.login() via @Request().user.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, password: string): Promise<User> {
    const body = req.body as { organizationSlug?: string };
    const organizationSlug = body.organizationSlug?.trim();

    if (!organizationSlug) {
      throw new UnauthorizedException('organizationSlug is required');
    }

    const user = await this.authService.validateCredentials(email, password, organizationSlug);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
