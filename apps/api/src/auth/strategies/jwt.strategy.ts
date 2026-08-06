import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { EnvConfig } from '../../config';
import type { JwtPayload } from '../types/jwt-payload.interface';
import type { RequestUser } from '../types/request-user.interface';

/**
 * Extracts and validates the JWT access token from the httpOnly `access_token` cookie.
 *
 * Why cookie extraction (not Authorization header):
 *   httpOnly cookies are inaccessible to JavaScript — immune to XSS token theft.
 *   The Authorization header approach requires JS access to the token, making
 *   it vulnerable to XSS if any dependency is compromised.
 *
 * The validated payload is attached to req.user and returned from validate().
 * JwtAuthGuard calls this strategy and attaches the result to the request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<EnvConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Primary: Extract from httpOnly cookie (secure, XSS-immune)
        (req: Request) => {
          const token: unknown = req?.cookies?.['access_token'];
          return typeof token === 'string' ? token : null;
        },
        // Fallback: Extract from Authorization header (cross-origin scenarios)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    // Explicit type+length checks. The previous truthiness check accepted
    // empty strings, which would propagate as `organizationId: ""` into
    // the RLS context — a bug-mask, not a security hole, but easy to fix
    // and worth doing for clarity. (Audit finding S-6.)
    if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
      throw new UnauthorizedException('Malformed token payload');
    }
    if (typeof payload.orgId !== 'string' || payload.orgId.trim().length === 0) {
      throw new UnauthorizedException('Malformed token payload');
    }
    if (typeof payload.email !== 'string' || payload.email.trim().length === 0) {
      throw new UnauthorizedException('Malformed token payload');
    }

    return {
      userId: payload.sub,
      organizationId: payload.orgId,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}
