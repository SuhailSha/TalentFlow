import type { PrismaClient } from '@repo/database';

import { tenantContext } from './tenant-context';

/**
 * RLS-enforcing Prisma client extension.
 *
 * Adds a per-query guard: every operation must run inside a
 * `tenantContext.run(...)` envelope. If no context is active, the query
 * THROWS rather than silently bypassing tenant scoping.
 *
 * IMPORTANT — what this extension does and does not do:
 *
 *   ✓ Throws when a Prisma query is issued without a tenant context.
 *     This catches application bugs early (especially in tests).
 *
 *   ✗ Does NOT automatically `SET LOCAL app.current_org_id` before each
 *     query. Prisma's $extends API does not give us a reliable hook to
 *     hold a transaction across the GUC set + the user query (the inner
 *     query() callback is bound to the outer client, not a transaction).
 *
 * Why this is still safe today:
 *
 *   - The application currently connects as the `postgres` superuser,
 *     which bypasses RLS at the Postgres level. Tenant isolation is
 *     enforced by the existing service+repository pattern
 *     (organizationId in every WHERE clause).
 *
 *   - When the production deployment switches to the `app_tenant` role
 *     (Phase 1 ops task), every query made WITHOUT a fresh GUC returns
 *     zero rows (the NULLIF guard in the policy converts an unset GUC
 *     to NULL, which never matches any organization_id). The safe
 *     failure mode is preserved.
 *
 *   - Operations that explicitly need RLS enforcement at the DB layer
 *     should use the `runInTenantTransaction` helper below, which opens
 *     a transaction, sets the GUC, runs the callback inside it, and
 *     commits. This is the production pattern for code paths that
 *     cannot rely on application-layer guards alone (cross-table joins,
 *     raw SQL, etc.).
 *
 * For cross-tenant operations (audit archival, retention purge,
 * platform mode), use the `prismaAdmin` client instead — it bypasses
 * this guard and connects as a BYPASSRLS role.
 *
 * @see docs/architecture/adr/adr-002-rls-strategy.md
 * @see packages/rls-poc/REPORT.md  — empty-string GUC quirk
 */
export function withRls<TClient extends PrismaClient>(client: TClient) {
  return client.$extends({
    name: 'tenant-rls-guard',
    query: {
      $allOperations: async ({ operation, model, args, query }) => {
        // Lifecycle operations pass through unconditionally.
        if (
          model === undefined &&
          (operation === '$connect' || operation === '$disconnect')
        ) {
          return query(args);
        }

        const ctx = tenantContext.get();
        if (!ctx?.organizationId) {
          throw new Error(
            `Prisma query (${model ?? 'raw'}.${operation}) attempted without a tenant context. ` +
            `Wrap the call in tenantContext.run({ organizationId }, () => …) ` +
            `or use prismaAdmin for cross-tenant operations.`,
          );
        }

        return query(args);
      },
    },
  });
}

/**
 * Runs a callback inside a Prisma interactive transaction with the
 * `app.current_org_id` GUC bound to the active tenant's id.
 *
 * Use this when you need actual database-layer RLS enforcement (rather
 * than just the application-layer organizationId filter) — typically for
 * raw SQL paths or complex multi-table operations where the developer
 * cannot guarantee every WHERE clause carries organizationId.
 *
 * The `tx` parameter passed to the callback is a fully-typed Prisma
 * transaction client. Use it instead of the outer client to ensure the
 * GUC applies.
 *
 * @example
 *   await runInTenantTransaction(prisma, async (tx) => {
 *     return tx.candidate.findMany();   // sees only this tenant's rows
 *   });
 */
export async function runInTenantTransaction<T>(
  client: PrismaClient,
  fn: (tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  const ctx = tenantContext.get();
  if (!ctx?.organizationId) {
    throw new Error(
      'runInTenantTransaction called without a tenant context. ' +
      'Use tenantContext.run(...) to establish one first.',
    );
  }
  const orgId = ctx.organizationId.replace(/'/g, "''"); // defense-in-depth
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${orgId}'`);
    return fn(tx);
  });
}
