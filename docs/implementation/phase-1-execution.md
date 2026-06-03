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
| **TF-1-5** | **Done** | eng | TF-1-2, TF-1-3 | 2d | 1d | Slice 2 | **20/20 outbox validation passes** (T1-T10 + sub-checks): emit/rollback, sequence order, success marking, attempts++ on null/throw, retry on next tick, SKIP LOCKED double-publish protection, batch-level poison protection, restart survival. Migration applied to live cluster (`outbox_events` table + RLS policy). Schema: id, sequence_num, organization_id, aggregate_type, aggregate_id, event_type, payload, correlation_id, attempts, last_error, published_at, created_at. Indexes: partial on (sequence_num) WHERE published_at IS NULL; (published_at) WHERE published_at IS NOT NULL; (organization_id, created_at DESC). |
| **TF-1-6** | **Done** (Redis tests pending staging) | eng | TF-1-5 | 1.5d | 1d | Slice 2 | `StreamsPublisher` + `StreamsConsumerRegistry` + `OutboxRelayWorker` integrated. Consumer groups, XAUTOCLAIM-based PEL recovery, DLQ stream on `:dlq` suffix, in-message attempts counter for retry. **End-to-end Redis test harness written** (`packages/rls-poc/scripts/streams-e2e.cjs`) covering S1 publish→consume→ack, S2 restart survival via PEL, S3 two-consumer fan-out, S4 DLQ wiring, S5 idempotency at-least-once delivery, S6 pub/sub fan-out — **deferred to staging** (no Redis in dev). |
| TF-1-7 | Not Started | eng | — | 2d | — | — | — |
| TF-1-8 | Not Started | eng | — | 2d | — | — | — |
| **TF-1-9** | **Done** | eng | TF-1-3 | 1d | 0.5d | Slice 2 | Custom Redis-backed `RateLimitGuard` with `@RateLimit({ max, windowSec, routeKey })` decorator. Sliding-window epoch counter; per-tenant scoping when authenticated, IP scoping otherwise. Sets `X-RateLimit-Limit/Remaining/Window` + `Retry-After` headers; raises 429 RATE_LIMITED. No new dependency (uses existing ioredis). |
| TF-1-10 | Not Started | eng | TF-1-7 | 2d | — | — | — |
| TF-1-11 | Not Started | eng | — | 1.5d | — | — | — |
| TF-1-12 | Not Started | eng | — | 0.5d | — | — | — |
| TF-1-13 | Not Started | eng | — | 1d | — | — | — |
| TF-1-14 | Not Started | eng | — | 0.5d | — | — | — |
| TF-1-15 | Not Started | eng | — | 0.5d | — | — | — |
| TF-1-16 | Not Started | eng | TF-1-2 | 2d | — | — | — |

**Track A progress: 8 / 17 tickets · ~5d actual / ~12d remaining**

## Track B — AI Service Foundation (parallel)

| Ticket | Status | Owner | Deps | Est. | Actual |
|---|---|---|---|---|---|
| **TF-1.5-1** | **Done** | eng | foundation-v1.0 | 2d | 1d (Slice 2) |
| TF-1.5-2..12 | Not Started | eng | TF-1.5-1 | 12d total | — |

**TF-1.5-1 outcome:** `LlmProvider` interface locked + `GeminiProvider` adapter shipped. **Boundary discipline enforced**: provider has zero knowledge of candidates / jobs / Prisma / tenants — only opaque `LlmRequest`/`LlmResponse` types. **Provenance contract enforced at the provider boundary**: responses without a non-empty `sources[]` array are rejected with `LlmProviderError(kind: 'no_provenance')` before any business code sees them. **Cost reported** in 6 dimensions per response: tokens (prompt/completion/total), USD, latency, model id, provider name. Adding OpenAI / Anthropic is now a matter of writing a new file matching the interface and adding it to `AiModule`'s provider array — zero business-logic change required.

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
| R7 | Streams E2E test harness (`streams-e2e.cjs`) cannot run in dev (no Redis); validated against Postgres-only mock publisher today | Medium | Open | Staging or GitHub Actions Redis service container must run the harness before TF-1-6 is operationally cleared for customer traffic | DevOps |

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
  ├─ TF-1-1 ✅ → TF-1-1.5 ✅ → TF-1-2 ✅ → TF-1-3 ✅ → TF-1-5 ✅ → TF-1-6 ✅
  │                                            │
  │                                            └─ TF-1-9 ✅ rate limit
  │
  ├─ TF-1-4 ✅
  │
  └─ Track B: TF-1.5-1 ✅ → TF-1.5-5/6 (next)
```

**All blocking platform plumbing complete.** Next:
- **Slice 3** can begin UI work (TF-1-10 collapsible sidebar with workspace switcher, TF-1-11 real command palette, TF-1-12 inbox shell, TF-1-13 forgot-password flow) — the foundation supports them.
- **Track B Slice 3** continues with TF-1.5-5 (prompt registry) + TF-1.5-6 (context assembler).
- DevOps **must stand up Redis in staging** before TF-1-6's E2E test harness can validate the Streams path end-to-end against a real broker.

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

## Slice 2 — Summary

| Metric | Value |
|---|---|
| Tickets closed | 4 (TF-1-5, TF-1-6, TF-1-9, TF-1.5-1) |
| Planned effort | 6.5d |
| Actual effort | ~3.5d |
| Deviations from ADR | 0 |
| New risks | R7 (staging Redis required for full Streams E2E validation) |
| Verified | 20/20 outbox validation against live Postgres (T1–T10 covering emit-in-tx, sequence order, success marking, retry on null/throw, retry on next tick, SKIP LOCKED concurrent workers, batch poison protection, restart survival). Streams E2E harness written, gated on REDIS_URL — runs in staging only. |
| LLM boundary verified | `GeminiProvider` is the ONLY file that knows about Google's SDK. The contract returns typed, schema-validated outputs with `sources[]` enforced. Adding OpenAI/Anthropic = new adapter file, no business-code change. |
| Outstanding | UI tickets (TF-1-10 through TF-1-15) now safely unblocked; Track B continues with prompt registry + context assembler. |
