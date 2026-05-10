/**
 * Data encoded inside every access token (JWT payload).
 *
 * Kept minimal — only what guards need without hitting the DB.
 * Extended profile (name, avatar, org details) is fetched on /auth/me.
 *
 * roles and permissions are embedded at login time and stay valid for the
 * 15-minute access token TTL. Stale claims resolve on next token refresh.
 *
 * Fields follow JWT registered claims (RFC 7519) where applicable:
 *   sub — subject (userId)
 *   jti — JWT ID (unique per token; reserved for future revocation support)
 *   iat — issued-at (added automatically by @nestjs/jwt)
 *   exp — expiration (added automatically by @nestjs/jwt)
 */
export interface JwtPayload {
  sub: string;
  orgId: string;
  email: string;
  roles: string[];
  permissions: string[];
  jti: string;
}
