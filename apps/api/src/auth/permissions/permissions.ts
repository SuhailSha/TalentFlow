/**
 * Canonical permission strings for the platform.
 * Format: resource:action (lowercase, colon-separated)
 *
 * Usage:
 *   @RequirePermissions(Permission.CANDIDATES_READ)
 *   hasPermission(user.permissions, Permission.CANDIDATES_CREATE)
 *
 * Expansion: add new permissions here; update SYSTEM_ROLES accordingly.
 * Do NOT remove or rename existing permissions — that's a breaking change
 * requiring a DB migration to update stored role permission arrays.
 */
export const Permission = {
  // ── Users ────────────────────────────────────────────────────────────────
  USERS_READ: 'users:read',
  USERS_INVITE: 'users:invite',
  USERS_UPDATE: 'users:update',
  USERS_SUSPEND: 'users:suspend',
  USERS_DELETE: 'users:delete',

  // ── Roles ────────────────────────────────────────────────────────────────
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  // ── Organization ─────────────────────────────────────────────────────────
  ORG_READ: 'org:read',
  ORG_UPDATE: 'org:update',

  // ── Candidates (Step 6) ──────────────────────────────────────────────────
  CANDIDATES_READ: 'candidates:read',
  CANDIDATES_CREATE: 'candidates:create',
  CANDIDATES_UPDATE: 'candidates:update',
  CANDIDATES_DELETE: 'candidates:delete',

  // ── Vendors (Step 6) ─────────────────────────────────────────────────────
  VENDORS_READ: 'vendors:read',
  VENDORS_CREATE: 'vendors:create',
  VENDORS_UPDATE: 'vendors:update',
  VENDORS_DELETE: 'vendors:delete',

  // ── Jobs / Job Descriptions (Step 6) ────────────────────────────────────
  JOBS_READ: 'jobs:read',
  JOBS_CREATE: 'jobs:create',
  JOBS_UPDATE: 'jobs:update',
  JOBS_DELETE: 'jobs:delete',

  // ── Submissions (Step 6) ─────────────────────────────────────────────────
  SUBMISSIONS_READ: 'submissions:read',
  SUBMISSIONS_CREATE: 'submissions:create',
  SUBMISSIONS_UPDATE: 'submissions:update',

  // ── Interviews (Step 6) ──────────────────────────────────────────────────
  INTERVIEWS_READ: 'interviews:read',
  INTERVIEWS_CREATE: 'interviews:create',
  INTERVIEWS_UPDATE: 'interviews:update',

  // ── Reports ──────────────────────────────────────────────────────────────
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',

  // ── Billing ──────────────────────────────────────────────────────────────
  BILLING_READ: 'billing:read',
  BILLING_MANAGE: 'billing:manage',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * Sentinel value used exclusively in system role definitions.
 * Never store this in user-created custom roles; enforce at the service layer.
 */
export const WILDCARD_PERMISSION = '*';

/**
 * Returns true if the set of granted permissions satisfies the required one.
 * A wildcard grant ('*') satisfies every permission.
 */
export function hasPermission(granted: string[], required: Permission): boolean {
  return granted.includes(WILDCARD_PERMISSION) || granted.includes(required);
}

/** Returns true if ALL required permissions are satisfied. */
export function hasAllPermissions(granted: string[], required: Permission[]): boolean {
  return required.every((p) => hasPermission(granted, p));
}
