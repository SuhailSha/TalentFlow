/**
 * Frontend auth types — mirror the backend UserProfile shape.
 * Source of truth: apps/api/src/auth/types/request-user.interface.ts
 */

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  roles: string[];
  permissions: string[];
}

/** Typed role names matching the system roles seeded in packages/database. */
export type SystemRole =
  | 'super_admin'
  | 'org_admin'
  | 'recruiter'
  | 'hiring_manager'
  | 'vendor_manager'
  | 'viewer';

/** Login form payload */
export interface LoginCredentials {
  email: string;
  password: string;
  organizationSlug: string;
}

/** API response shape from POST /auth/login and GET /auth/me */
export interface AuthResponse {
  user: UserProfile;
  // Optional tokens for cross-origin scenarios (only present in login response)
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}
