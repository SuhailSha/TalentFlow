/**
 * Authenticated user context attached to every request by JwtAuthGuard.
 *
 * Available via:
 *   @CurrentUser()          — controller parameter decorator
 *   AppContextService.user  — anywhere in the DI tree (nestjs-cls)
 *   req.user                — raw Express request (Express.Request augmentation)
 */
export interface RequestUser {
  userId: string;
  organizationId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

/** Public user profile returned by GET /auth/me. */
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
