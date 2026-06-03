# RLS Proof of Concept

This package is a **scratch/sandbox** validation of TalentFlow's Row-Level
Security approach (ADR-001, ADR-002). It is **not shipped** with the
application; it exists to prove the design before we apply RLS to
production tables.

## What this PoC validates

| Dimension | Method |
|---|---|
| **PostgreSQL RLS policies** | Two test tenants, two test rows. Query with no context → 0 rows. Query with tenant A context → only A's row. Cross-tenant insert attempt → rejected. |
| **Prisma compatibility** | Prisma extension wraps every query in a transaction that begins with `SET LOCAL app.current_org_id`. Validates that the GUC is set before the query executes. |
| **PgBouncer transaction-pooling compatibility** | The test harness runs the same query battery directly against PG and (when available) through PgBouncer in transaction mode. `SET LOCAL` must survive the same transaction; subsequent transactions must start with the GUC unset. |
| **Background job context propagation** | Simulates a BullMQ worker: reads `organizationId` from job metadata, sets it in AsyncLocalStorage, runs a Prisma query, verifies isolation. |
| **Tenant switching mid-session** | Switches context A → B → A within the same Node process; verifies each switch correctly scopes queries. |

## Layout

```
packages/rls-poc/
├── README.md                       this file
├── sql/
│   ├── 001_schema.sql              minimal schema (orgs, candidates_poc)
│   ├── 002_roles.sql               app_tenant + app_admin roles, GRANTs
│   ├── 003_rls.sql                 enable + force RLS, policies
│   └── 004_seed.sql                two tenants with one candidate each
├── scripts/
│   ├── setup.cjs                   runs 001–004 in order
│   ├── teardown.cjs                drops test schema
│   └── test.cjs                    runs the 12 test cases
└── REPORT.md                       what we learned (filled in after running)
```

## Prereqs

- Local Postgres 14+ reachable via DATABASE_URL.
  Default: `postgresql://postgres:postgres@localhost:5432/recruitment_dev`
- The `pg` package, already installed at the repo root via Prisma's
  transitive dependency.

## Run

```
# From repo root, with the embedded PG running:
node packages/rls-poc/scripts/setup.cjs
node packages/rls-poc/scripts/test.cjs
node packages/rls-poc/scripts/teardown.cjs
```

The harness writes a transcript to `packages/rls-poc/last-run.log`.

## Reading the results

Each test case prints `PASS` or `FAIL` with a one-line reason. A summary
at the end indicates total pass/fail. The full transcript shows the SQL
each step issued so divergences from the production middleware (when it
ships) are easy to spot.

## Why this is throwaway code

The production RLS middleware lives in `apps/api/src/database/` (Phase 1).
The PoC's purpose is to **inform** that implementation, not be it.
Once the production middleware exists and is exercised by the full test
suite, this PoC can be deleted. Keeping it in tree (in `packages/rls-poc/`)
serves as documented evidence for security review.

## What this does NOT validate

- Production-scale performance (RLS overhead has been measured at < 3% on
  representative workloads; this PoC reaffirms but does not stress-test)
- Schema-per-tenant fallback (the hybrid path; deferred until first
  premium customer requests it)
- Hash-chained audit logs (ADR-003 / ADR-007; separate PoC if needed)
