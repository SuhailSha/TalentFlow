# ADR-001 — Multi-tenancy Strategy
Status: Accepted
Date: 2026-06-03

## Context

TalentFlow is a multi-tenant SaaS for staffing agencies. Each tenant is an
**Organization** in our schema. Tenants must not see each other's data. The
existing implementation enforces tenant scoping in application code: every
service passes `organizationId` to its repository which adds it to the Prisma
`where` clause. Two `Critical` IDOR defects surfaced in Phase 0B from
repositories that accepted only an entity `id`, proving the application-layer
guarantee is fragile.

Three standard isolation strategies were on the table:

| Strategy | Isolation | Operational complexity | Cost |
|---|---|---|---|
| Database-per-tenant | Highest | Highest | Highest |
| Schema-per-tenant | High | High (N× migrations) | Medium |
| Shared schema + row scoping | Medium | Low | Low |

## Decision

Adopt **shared schema with row-level scoping** as the primary strategy, with
two layers of enforcement:

1. **Application layer**: every repository method requires `organizationId`
   as a parameter and includes it in the `where` clause. No exceptions.
2. **Database layer**: PostgreSQL **Row-Level Security (RLS)** is enabled on
   every tenant-scoped table. The session variable `app.current_org_id` is
   set by Prisma middleware on every request and by job workers before
   handler execution. RLS policies enforce `organization_id =
   current_setting('app.current_org_id')::uuid`.

Layer (2) is the **defense-in-depth** guarantee: even if a future repository
method forgets to filter, the database refuses to return cross-tenant rows.

**Hybrid escape hatch.** Premium-tier customers who require physical
separation (regulated industries, sovereign-data) may be moved to a
dedicated schema using PostgreSQL `SET search_path` per connection. Code
must remain identical; only deployment topology differs. This is a future
capability, not built today, but the architecture must not preclude it.

Reject **database-per-tenant** and **schema-per-tenant as default**. Both
multiply migration risk (N× the operations to fail), increase deployment
cost, and provide isolation we don't need for the long tail of customers.

## Consequences

### Positive

- Single Prisma schema, single migration set, single connection pool — all
  scale with tenants without operational multiplier.
- RLS provides defense-in-depth: the IDOR class of bugs cannot leak data
  even if a repository forgets to scope.
- The tenant context (`app.current_org_id`) is the single source of truth;
  audit, RLS, cache keys, queue keys, and AI cost meter all key off it.
- Schema-per-tenant remains available as an escape hatch for ≤ 5 high-trust
  customers without touching application code.

### Negative

- All shared-resource bottlenecks (Postgres write IOPS, Redis throughput,
  Bull queue contention) apply per-tenant — the noisy-neighbor problem.
  Mitigated by per-tenant rate limiting (ADR-006) and per-tenant resource
  quotas.
- A misconfigured Prisma middleware that fails to set `app.current_org_id`
  causes 100% of queries to return zero rows. Failure mode is
  observable (no data) rather than dangerous (leaked data), which is
  acceptable.
- Backups are tenant-mixed. Per-tenant restore requires per-table filtered
  imports rather than simple snapshot restore. A documented runbook in
  ADR-006 covers this.

### Neutral / known trade-offs

- The hybrid path (schema-per-tenant for premium) requires a deployment-time
  switch but no code change. Decision deferred until first request from a
  paying customer.
- Connection pool size and PgBouncer mode interact with RLS session state.
  See ADR-002 for the binding rules.

## Alternatives considered

**Schema-per-tenant for all tenants** — rejected. Migrations must be applied
to every tenant schema, multiplying release risk linearly with customer
count. A single failure leaves the platform in mixed-version state, which is
operationally untenable.

**Database-per-tenant** — rejected for the same reason as above, with the
added cost of N database instances and N times the infrastructure spend.

**No RLS — application-layer enforcement only** — rejected. Phase 0B
demonstrated this layer cannot be trusted alone. RLS adds a one-time setup
cost in exchange for a permanent guarantee.

**Tenant ID prefix in primary keys (e.g., `<orgId>-<recordId>`)** — rejected.
Provides no enforcement; same trust model as plain `organizationId` column;
loses join performance.

## References

- ADR-002 (RLS implementation details)
- Phase 0B Security Audit findings S-1, S-2
- PostgreSQL RLS docs: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
