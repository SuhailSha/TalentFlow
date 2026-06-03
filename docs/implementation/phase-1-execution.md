# Phase 1 — Live Execution Tracker

**Started:** 2026-06-03
**Baseline tag:** `foundation-v1.0`
**Last updated:** 2026-06-03 (Slice 1: TF-1-1 through TF-1-4)
**Convention:** Update this file after every ticket transition.

Status legend: `Not Started` · `In Progress` · `Blocked` · `Done`

---

## Track A — Application Shell + Auth + Platform Plumbing

| Ticket | Status | Owner | Deps | Est. | Actual | Commit | Risks discovered |
|---|---|---|---|---|---|---|---|
| **TF-1-1** | **Done** | eng | foundation-v1.0 | 1d | 0.25d | Slice 1 | None — SQL migration verified on live cluster. 4 roles present; `app_tenant` confirmed NOT BYPASSRLS. |
| **TF-1-1.5** | **Done** | eng | TF-1-1 | 1d | 0.5d | Slice 1 | PgBouncer not running locally; contract validated against direct PG. 5/5 pass. Staging needs follow-up integration test once PgBouncer ships (R2). |
| **TF-1-2** | **Done** | eng | TF-1-1, TF-1-1.5 | 2d | 1d | Slice 1 | **35 tenant tables protected.** Real isolation verified via temp 2nd org test (cross-leak=0, no-context=0, ACME=31, TEMP=1). Note: API role still `postgres` in dev (superuser → bypasses RLS); production binding to `app_tenant` is a DevOps ticket (R6). |
| **TF-1-3** | **Done** (guard) | eng | TF-1-2 | 2d | 0.5d | Slice 1 | **Pragmatic scope:** ships `tenantContext` AsyncLocalStorage + `withRls()` guard that THROWS on missing context + `runInTenantTransaction()` helper for code paths that need DB-layer GUC enforcement. Per-query automatic `SET LOCAL` deferred — see deviation R5 below. |
| **TF-1-4** | **Done** | eng | TF-1-1 | 0.5d | 0.25d | Slice 1 | `PrismaAdminService` wired via `DATABASE_ADMIN_URL` (falls back to `DATABASE_URL` in dev). |
| TF-1-5 | Not Started | eng | TF-1-2, TF-1-3 | 2d | — | — | — |
| TF-1-6 | Not Started | eng | TF-1-5 | 1.5d | — | — | — |
| TF-1-7 | Not Started | eng | — | 2d | — | — | — |
| TF-1-8 | Not Started | eng | — | 2d | — | — | — |
| TF-1-9 | Not Started | eng | TF-1-3 | 1d | — | — | — |
| TF-1-10 | Not Started | eng | TF-1-7 | 2d | — | — | — |
| TF-1-11 | Not Started | eng | — | 1.5d | — | — | — |
| TF-1-12 | Not Started | eng | — | 0.5d | — | — | — |
| TF-1-13 | Not Started | eng | — | 1d | — | — | — |
| TF-1-14 | Not Started | eng | — | 0.5d | — | — | — |
| TF-1-15 | Not Started | eng | — | 0.5d | — | — | — |
| TF-1-16 | Not Started | eng | TF-1-2 | 2d | — | — | — |

**Track A progress: 5 / 17 tickets · ~2.5d actual / ~14.5d remaining**

## Track B — AI Service Foundation (parallel, not started)

| Ticket | Status | Owner | Deps | Est. | Actual |
|---|---|---|---|---|---|
| TF-1.5-1 | Not Started | eng | foundation-v1.0 | 2d | — |
| TF-1.5-2..12 | Not Started | eng | — | 12d total | — |

---

## Live Risk Register

| # | Risk | Severity | Status | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Postgres roles via SQL migration vs Terraform; prod cluster not yet Terraform-managed | Medium | Open | TF-1-1 migration is idempotent; Terraform later imports the roles | DevOps |
| R2 | PgBouncer not in dev; TF-1-1.5 validated contract, not PgBouncer itself | Medium | Open | Staging integration test required before Phase 5; `PGBOUNCER_URL` env var ready in harness | DevOps |
| R3 | AsyncLocalStorage propagation across NestJS event listeners is non-trivial | Medium | Open | TF-1-3 ships the primitives; consumers must wire interceptors / job-context wrappers | Engineering |
| R4 | Existing app code may not yet use the new request-bound Prisma client | High | **Mitigated** | TF-1-3 ships as a *guard* (throws on missing context) but does not force-set GUC per query; existing services unchanged, no regression risk | Engineering |
| **R5** | **Prisma `$extends` cannot hold a transaction across the per-query GUC set; per-query automatic SET LOCAL not viable in this Prisma version.** | **High** | **Open** | Current API role (`postgres` superuser) bypasses RLS anyway. When prod flips to `app_tenant`, services needing DB-layer enforcement opt into `runInTenantTransaction()`. Repos already require `organizationId` from TF-PRE-1/2. | Engineering |
| R6 | API role in dev is `postgres` (superuser) — RLS exists but doesn't fire for API queries today | Medium | Open | Switching the DB role is a DevOps ticket; deferred until staging stand-up | DevOps |

---

## Architectural Deviations

| Date | Ticket | ADR affected | Deviation | Justification |
|---|---|---|---|---|
| 2026-06-03 | TF-1-3 | ADR-002 §2 | ADR-002 §2 specifies "Prisma `$extends` wraps every query in a transaction that runs `SET LOCAL` as its first statement." In practice, the `$extends` `query()` callback is bound to the outer client; calling it from inside `$transaction(async tx => ...)` does NOT route through `tx`. So GUC + user query don't share a tx envelope reliably. **Pragmatic shape shipped:** guard-by-throw + `runInTenantTransaction()` opt-in helper. | Defense-in-depth preserved (repo `organizationId` requirement + TF-PRE-1/2 fixes + RLS policies in DB). Per-query auto-binding requires either a custom pg connection pool or a session-config hook — both are Phase 5+ work, not a Foundation Freeze regression. |

---

## Critical Path (live)

```
foundation-v1.0
  │
  ├─ TF-1-1 ✅ → TF-1-1.5 ✅ → TF-1-2 ✅ → TF-1-3 ✅ (guard) → TF-1-5 (next)
  │                                            │
  │                                            └─ TF-1-9 rate limit (parallelizable)
  │
  ├─ TF-1-4 ✅
  │
  └─ Track B not started
```

Next: **TF-1-5 (Outbox)** → **TF-1-6 (Streams consumer)**.

---

## Slice 1 — Summary

| Metric | Value |
|---|---|
| Tickets closed | 5 (TF-1-1, TF-1-1.5, TF-1-2, TF-1-3, TF-1-4) |
| Planned effort | 6.5d |
| Actual effort | ~2.5d |
| Deviations from ADR | 1 (R5 — Prisma `$extends` limitation; documented) |
| New risks | R5, R6 |
| Verified | RLS policies on 35 tables; isolation test on real `candidates` (cross-leak=0, no-context=0) |
| Outstanding | TF-1-5 next, plus 11 Track A + 12 Track B tickets |
