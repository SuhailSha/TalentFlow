/**
 * Augments the Express Request type with fields populated by our middleware stack.
 *
 * POPULATION TIMELINE:
 *   req.id          ← set by pino-http (via LoggerModule) — first middleware to run
 *   req.requestId   ← set by RequestIdMiddleware (copies req.id, adds X-Request-ID header)
 *   req.tenantId    ← set by TenantMiddleware       (Step 5: Auth module)
 *   req.user        ← set by JwtAuthGuard            (Step 5: Auth module)
 *
 * Kept in a single declaration so all downstream consumers (filters, guards,
 * interceptors) share one canonical request shape.
 */
declare namespace Express {
  interface Request {
    /** Assigned by pino-http. Used as the base for requestId. */
    id: string;

    /** Canonical request identifier. Propagated in X-Request-ID header. */
    requestId: string;

    /**
     * Organization (tenant) ID.
     * Derived from req.user.organizationId after JWT validation.
     * Prefer AppContextService.organizationId in services (CLS-based).
     */
    tenantId?: string;

    /**
     * Authenticated user payload extracted from the JWT.
     * Populated by JwtAuthGuard → JwtStrategy.validate().
     * Undefined on @Public() routes.
     */
    user?: import('../../auth/types/request-user.interface').RequestUser;
  }
}
