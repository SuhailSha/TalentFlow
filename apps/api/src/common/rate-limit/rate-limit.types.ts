/**
 * Per-tenant rate limit configuration.
 *
 * The limiter uses a sliding-window counter scoped by `scopeKeyFn`. The
 * default scope key is the active tenant's id; fall back to client IP
 * for unauthenticated routes (e.g., /auth/login). Combine with a route
 * key to provide per-route budgets.
 */
export interface RateLimitOptions {
  /** Max requests within `windowSec`. */
  max: number;
  /** Window size in seconds. */
  windowSec: number;
  /** Logical route or feature name (becomes part of the Redis key). */
  routeKey: string;
}

export const RATE_LIMIT_KEY = 'tf:ratelimit:options';
