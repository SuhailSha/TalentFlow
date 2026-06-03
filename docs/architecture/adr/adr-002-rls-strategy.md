# ADR-002 — Row-Level Security Strategy
Status: Accepted
Date: 2026-06-03
Builds on: ADR-001

## Context

ADR-001 mandates Postgres Row-Level Security as the defense-in-depth tenant
isolation layer. The implementation has multiple non-obvious technical
binding decisions:

1. How does the API process tell Postgres which tenant it is operating as?
2. How is that tenant context propagated to background workers?
3. How does this interact with connection pooling (PgBouncer) and Prisma's
   own connection management?
4. How does the application **switch** tenants — e.g., when a platform
   administrator needs to query across tenants?
5. How are RLS policies tested?

These decisions must be made before production code is written. A PoC has
validated the choices below (see `packages/rls-poc/`).

## Decision

### 1. Tenant context propagation: Postgres session GUC

The tenant identifier is propagated through a custom **session-level GUC**
(Grand Unified Configuration variable) named `app.current_org_id`.
Postgres allows any namespaced variable to be set; values are strings.

- Read in policies: `current_setting('app.current_org_id', true)::uuid`
- Set per request/job: `SET LOCAL app.current_org_id = '<uuid>'`

The `true` argument to `current_setting` makes the call return NULL when the
variable is unset, rather than raising. RLS policies treat NULL as "no
access" — a missing context means zero rows.

### 2. Prisma binding: middleware + transaction

Prisma's `$extends` API wraps every query. The middleware:

1. Reads the active tenant from request-scoped storage (NestJS `AsyncLocalStorage`)
2. Wraps the operation in a transaction
3. Runs `SET LOCAL app.current_org_id = '<uuid>'` as the first statement
4. Executes the actual query

`SET LOCAL` (not `SET`) ensures the value is bound to the transaction. When
the transaction commits or rolls back, the variable is cleared. This is
**required** for connection-pool safety (see §3).

### 3. PgBouncer compatibility: transaction mode + SET LOCAL

The production database connection passes through PgBouncer in **transaction
pooling mode**. In transaction mode, a backend connection is shared across
many client transactions; session-level state is unsafe.

`SET LOCAL` is safe in transaction mode because the value is scoped to the
transaction, not the session. PgBouncer rebinds the connection to a new
backend per transaction; each new transaction starts with the variable
unset, and the middleware re-sets it as its first statement.

**Rule:** never use `SET` (session-level) in application code. Only
`SET LOCAL` (transaction-level). The Prisma middleware enforces this; any
raw SQL that uses `SET` without `LOCAL` is rejected in code review.

Statement mode is prohibited because Prisma uses prepared statements and
transactions.

### 4. Background job binding

Every BullMQ job carries `organizationId` in its metadata. The worker:

1. Reads `organizationId` from the job
2. Stores it in `AsyncLocalStorage` for the duration of the handler
3. The same Prisma middleware picks it up and emits `SET LOCAL`

Jobs that operate across tenants (audit archival, AI cost rollup) must
explicitly use the **admin client** (see §5) and never the standard
tenant-scoped Prisma instance.

### 5. Tenant switching: admin client

Two Prisma clients are exported from `apps/api/src/database/`:

- `prisma` — the tenant-scoped client. Every query uses the middleware.
  Cannot operate without a tenant context. Throws at runtime if used
  without `AsyncLocalStorage` set.
- `prismaAdmin` — the bypass client. RLS policies recognize a special role;
  this client connects as that role. **Auditable usage only**: every call
  is wrapped in a span and tagged in OpenTelemetry. Limited to:
  - Platform mode operations (future)
  - Cross-tenant maintenance jobs (audit archival, retention purge)
  - Tenant onboarding (creating the org row itself)

Bypass attempts via `prismaAdmin` are alarmed and trigger an audit log
entry with the calling stack.

### 6. RLS policies

Every tenant-scoped table gets the same policy shape:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;  -- applies to table owner too

CREATE POLICY <table>_tenant_isolation ON <table>
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);
```

`FORCE ROW LEVEL SECURITY` is required because Prisma's app role is also the
table owner; without `FORCE`, owners bypass policies.

The `WITH CHECK` clause makes inserts and updates that try to assign a
different `organization_id` fail. Combined, this means even if the
application sets `organization_id` incorrectly, the database refuses.

### 7. Bypass role for migrations and admin

Three Postgres roles:

- `app_tenant` — RLS-bound; used by all API requests and tenant jobs
- `app_admin` — bypasses RLS (`BYPASSRLS` attribute); used by `prismaAdmin`
- `app_migrations` — bypasses RLS; used only by Prisma migrate

Audit policy: `app_admin` connections logged via Postgres `log_statement` on
the prod cluster.

### 8. Testing

Every new tenant-scoped table requires a test asserting RLS works:

- Two tenants A and B
- Insert one row per tenant
- Set context to A; verify only A's row is returned
- Set context to B; verify only B's row
- Unset context; verify zero rows
- Attempt to insert a row into B from context A; verify rejection

A reusable test harness in `apps/api/test/rls.helper.ts` ships in
Pre-Phase-1 (see PoC).

### 9. Performance

RLS adds a `WHERE organization_id = …` predicate to every query. Since the
application already passes `organization_id`, the query planner sees a
duplicate clause and (with composite indexes leading with `organization_id`)
optimizes both to the same index. Measured overhead in the PoC: < 3% on
representative workloads.

## Consequences

### Positive

- One-shot guarantee: cross-tenant data leakage is structurally impossible.
- Tenant context is uniform across HTTP, jobs, events, and AI calls.
- Tests are mechanical and reusable.

### Negative

- Every developer must understand the rule: never `SET` without `LOCAL`.
  Onboarding doc + code review checklist.
- `prismaAdmin` is a footgun. Audited via OTel; reviewed in security gate.
- Raw SQL that joins tenant-scoped tables to non-tenant tables requires
  care — RLS only applies to tables with the policy attached.
- A test database with PgBouncer is mandatory for CI to catch transaction-
  pooling regressions. CI cost increases marginally.

### Neutral

- The PoC under `packages/rls-poc/` is the canonical reference. Production
  code mirrors the PoC's middleware shape.

## Alternatives considered

**Session-level `SET` instead of `SET LOCAL`** — rejected; incompatible with
transaction-pooled PgBouncer.

**Prefix every query manually in repositories** — rejected; this is what we
have today and Phase 0B proved it can be circumvented.

**Postgres ROLES per tenant** — rejected. N roles for N tenants does not
scale; Postgres role limits and connection complexity make this impractical.

**Per-request connection (no pooling)** — rejected; connection establishment
cost dominates at scale.

## References

- PoC: `packages/rls-poc/`
- ADR-001 (multi-tenancy strategy)
- PgBouncer transaction pooling: https://www.pgbouncer.org/features.html
