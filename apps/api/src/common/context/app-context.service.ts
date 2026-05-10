import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import type { RequestUser } from '../../auth/types/request-user.interface';

interface ClsStore {
  requestId: string;
  user: RequestUser | null;
  // Index signature required by nestjs-cls ClsStore constraint
  [key: string]: unknown;
  [key: symbol]: unknown;
}

/**
 * Typed wrapper around ClsService for structured request-scoped context.
 *
 * Why this exists:
 *   Services that need the current user's organizationId (for tenant isolation)
 *   or requestId (for audit logs) would otherwise need to receive the Request
 *   object as a constructor/method parameter — polluting every service signature.
 *   AppContextService provides clean typed getters backed by AsyncLocalStorage.
 *
 * Populated by:
 *   requestId — AppContextModule.setup() (at HTTP middleware phase)
 *   user      — JwtAuthGuard.canActivate() (after JWT validation)
 */
@Injectable()
export class AppContextService {
  constructor(private readonly cls: ClsService<ClsStore>) {}

  get requestId(): string {
    return this.cls.get('requestId') ?? 'unknown';
  }

  get user(): RequestUser | null {
    return this.cls.get('user') ?? null;
  }

  /** Throws 401 if called outside an authenticated request context. */
  get userId(): string {
    const user = this.user;
    if (!user) throw new UnauthorizedException('No authenticated user in context');
    return user.userId;
  }

  /** Throws 401 if called outside an authenticated request context. */
  get organizationId(): string {
    const user = this.user;
    if (!user) throw new UnauthorizedException('No authenticated user in context');
    return user.organizationId;
  }

  get permissions(): string[] {
    return this.user?.permissions ?? [];
  }

  setUser(user: RequestUser): void {
    this.cls.set('user', user);
  }

  setRequestId(id: string): void {
    this.cls.set('requestId', id);
  }
}
