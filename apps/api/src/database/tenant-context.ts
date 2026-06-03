import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Tenant context propagated across the async call graph (HTTP requests,
 * background jobs, event handlers). Read by the Prisma RLS middleware
 * (`with-rls.ts`) to set the Postgres session GUC `app.current_org_id`
 * inside the per-query transaction.
 *
 * Lifecycle:
 *   - HTTP requests: a NestJS interceptor (TenantContextInterceptor) runs
 *     `tenantContext.run({ organizationId, userId }, () => next.handle())`
 *     so every downstream call inherits the context.
 *   - Background jobs: the worker reads `organizationId` from the BullMQ
 *     job metadata and wraps the handler in `tenantContext.run(...)`.
 *   - Event consumers: same pattern, reading from the event envelope.
 *   - Admin operations: use the `prismaAdmin` client which bypasses RLS;
 *     it does NOT inherit AsyncLocalStorage and is independent of context.
 *
 * Reading from outside one of those entrypoints (e.g., a unit test) returns
 * undefined. The middleware then refuses to issue the query — fail closed.
 */

export interface TenantContext {
  organizationId: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

export const tenantContext = {
  /** Run `fn` inside the given tenant context. Async-safe. */
  run<T>(ctx: TenantContext, fn: () => Promise<T> | T): Promise<T> | T {
    return storage.run(ctx, fn);
  },

  /** Get the active context, or undefined if none. */
  get(): TenantContext | undefined {
    return storage.getStore();
  },

  /** Get the active organization id, or throw if no context is set. */
  requireOrgId(): string {
    const ctx = storage.getStore();
    if (!ctx?.organizationId) {
      throw new Error(
        'No tenant context. ' +
        'Every Prisma query through the tenant client must run inside ' +
        'tenantContext.run({ organizationId, ... }, () => …). ' +
        'For cross-tenant operations, use prismaAdmin (ADR-002 §5).',
      );
    }
    return ctx.organizationId;
  },
};
