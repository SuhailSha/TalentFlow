import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { hasAllPermissions } from '../permissions/permissions';
import type { Permission } from '../permissions/permissions';
import type { RequestUser } from '../types/request-user.interface';

/**
 * Enforces @RequirePermissions() metadata after JwtAuthGuard has run.
 *
 * Guard execution order (APP_GUARD registration order in AppModule):
 *   1. JwtAuthGuard  — authenticates, populates req.user
 *   2. PermissionsGuard — authorises based on req.user.permissions
 *
 * Routes without @RequirePermissions() pass through (authentication alone is sufficient).
 * @Public() routes bypass both guards.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: RequestUser }>();

    if (!user) {
      throw new ForbiddenException('No user context for permission check');
    }

    if (!hasAllPermissions(user.permissions, required)) {
      throw new ForbiddenException(
        `Missing required permission(s): ${required.join(', ')}`,
      );
    }

    return true;
  }
}
