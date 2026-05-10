import { SetMetadata } from '@nestjs/common';

import type { Permission } from '../permissions/permissions';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares the permissions a user must hold to access a route.
 * Enforced by PermissionsGuard (runs after JwtAuthGuard).
 *
 * Pass one or more permissions — ALL must be satisfied (AND semantics).
 * For OR semantics, use two separate endpoints or a custom guard.
 *
 * @example
 *   @RequirePermissions(Permission.CANDIDATES_CREATE)
 *   @Post()
 *   createCandidate() { ... }
 *
 *   @RequirePermissions(Permission.CANDIDATES_READ, Permission.REPORTS_EXPORT)
 *   @Get('export')
 *   exportCandidates() { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
