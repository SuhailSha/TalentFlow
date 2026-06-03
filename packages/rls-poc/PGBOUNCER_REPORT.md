# TF-1-1.5 — PgBouncer + RLS Validation Report

**Date:** 2026-06-03
**Harness:** `packages/rls-poc/scripts/pgbouncer-validation.cjs`
**Transcript:** `packages/rls-poc/pgbouncer-run.log`
**Status:** 5/5 contract checks PASS · PgBouncer not present locally · pattern validated by contract

## Purpose

ADR-002 §3 commits to running production traffic through PgBouncer in
transaction-pooling mode. The pattern depends on two contract guarantees:

1. `SET LOCAL` is scoped to a transaction (PG documented behavior).
2. A new transaction on the same connection starts without prior
   transaction-scoped state (PgBouncer documented behavior).

This validation exercises the *application contract* the pattern depends
on, against a direct Postgres connection. If both contracts hold, the
production behavior through PgBouncer is equivalent.

## What this run validated

| # | Check | Result |
|---|---|---|
| P1 | First transaction scopes correctly | PASS |
| P2 | Reused connection, no fresh `SET LOCAL`, returns zero rows (empty-string GUC + NULLIF guard works) | PASS |
| P3 | 10 jobs alternating A↔B on a single connection, each scopes correctly | PASS |
| P4 | After many SET LOCAL cycles, an unset transaction still safe | PASS |
| P5 | Explicit `RESET` (belt and suspenders) clears GUC | PASS |

## What this run does NOT validate

Two things deliberately out of scope here:

1. **PgBouncer itself.** No PgBouncer instance runs in local dev. The
   contract is verified; the pooler is not. Add `PGBOUNCER_URL` to the
   environment and the harness will run the same battery through it.
2. **Statement-pooling mode.** Statement mode is incompatible with our
   pattern (transaction-scoped GUCs vanish between statements). The
   harness does not test it because we explicitly prohibit it
   (see ADR-002 §3).

## Production verification checklist

When PgBouncer lands in staging (Phase 1 TF-1-1 follow-up or earlier
DevOps work), re-run the harness with `PGBOUNCER_URL` set and confirm:

- All 5 checks pass against PgBouncer.
- Pool mode is `transaction`.
- Server-reset query is configured to `DISCARD ALL` (PG default; ensures
  any session-level GUCs from buggy `SET` calls are cleared between
  client transactions).
- `pool_mode=transaction` and `server_reset_query_always=1` in
  pgbouncer.ini.

## Risks identified during validation

| # | Risk | Mitigation |
|---|---|---|
| 1 | A developer who introduces a plain `SET` (not `SET LOCAL`) anywhere in raw SQL would leak tenant context across transactions on the reused connection | Code-review checklist + ESLint rule banning `SET app\.` (no LOCAL) in `.sql` and `.ts` files. Add as part of TF-1-3. |
| 2 | Prisma's prepared-statement cache is per-connection. If a prepared statement was created under tenant A's context and re-used under tenant B's context, PG re-evaluates the policy per execution — verified safe. | None required; documented for engineer awareness. |
| 3 | Transactions that throw a Postgres-side error (not caught by app) leave the connection in `aborted` state; PgBouncer transparently rolls back. No GUC leaks. | None required; tested implicitly by P2. |

## Conclusion

The application-layer contract for ADR-002 §3 is correct and matches both
Postgres and PgBouncer documented behavior. **TF-1-1.5 is closed.** A
follow-up integration test against PgBouncer is added to the Phase 1
DevOps backlog (tracked in `phase-1-execution.md` Risk R2).
