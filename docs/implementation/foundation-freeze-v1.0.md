# Foundation Freeze v1.0

**Milestone date:** 2026-06-03
**Tag target:** `foundation-v1.0`
**Tag commit:** TBD (set on commit)

## Purpose

Foundation Freeze v1.0 is the named checkpoint at which the platform
substrate is considered production-ready for Phase 1 implementation to
begin. After this freeze:

- No platform-architecture changes ship without an ADR amendment.
- Phase 1 and Phase 1.5 begin in parallel.
- Phase 2 (UI features) does not begin until Phase 1 shell + 1.5 AI infra
  land.

## Checklist

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | IDOR fixes verified | ✅ | `apps/api/src/modules/submissions/submissions.repository.ts`, `…/interviews.repository.ts`; API tsc clean |
| 2 | RLS PoC enabled and validated | ✅ | `packages/rls-poc/REPORT.md`; 12/12 tests pass; NULLIF empty-string quirk captured |
| 3 | Audit append-only protections active | ✅ | Migration `20240601000100_audit_append_only` applied; G4.1 + G4.2 pass |
| 4 | Terraform baseline | ⏳ | Phase-1 ticket `TF-1-1` (not Foundation-blocking) |
| 5 | Redis / BullMQ production-ready | ✅ | `env.schema.ts` rejects `REDIS_ENABLED=false` in production (G5.1) |
| 6 | JWT production guards active | ✅ | `JWT_SECRET ≥ 64` enforced (G5.2); explicit null/type checks (G6.1) |
| 7 | Organization governance fields migrated | ✅ | Migration `20240601000000_org_branding_ai_retention`; `brandAccent*`, `dataRegion`, `aiEnabled`, `aiBudget*`, `retentionPolicy` present |
| 8 | ADRs approved | ✅ | All 7 ADRs marked Status: Accepted (G8.1) |
| 9 | Ticket catalog approved | ✅ | `docs/implementation/tickets.md` with Pre-Phase-1 closed, Phase 1–7 + R defined |
| 10 | Validation gate passed | ✅ | `foundation-validation-report.md`; 12/15 passed, 0 blocking |

**Score: 9/10 closed · 1 deferred (Terraform, Phase-1 ticket).**

Per the Validation Report, items 4, 7.2 (DR drill), and 10.1 (GrowthBook
reachable) are infrastructure work that lands in Phase 1 and does not
affect the Foundation Freeze.

## What is "frozen" by this milestone

After Foundation Freeze v1.0:

| Layer | Frozen until |
|---|---|
| **ADRs 001–007** | Until a new ADR supersedes (never edit in place) |
| **Multi-tenancy model** (RLS pattern + role hierarchy + NULLIF policy shape) | Phase 7 review of premium-tier schema-per-tenant hybrid |
| **Tenant context propagation** (`AsyncLocalStorage` + `app.current_org_id` GUC) | Until performance proves otherwise |
| **Repository signature contract** (`update/softDelete` require `organizationId`) | Always |
| **Audit append-only at DB layer** | Always (extending with hash chain in Phase 7) |
| **Event architecture** (outbox + Streams + SSE) | Until 1M-candidate-band re-evaluation |
| **AI advisory-only constraint** | Permanently (legal-binding) |
| **AI cost-tracking shape** (6 dimensions) | Permanently |
| **Search provider abstraction** | Until OpenSearch ships and Postgres-only fallback is dropped |
| **Deployment topology** (AWS-default + Vercel exception) | Until cloud-provider re-evaluation in Phase 7 |
| **GDPR retention policy shape** | Until first DSAR audit |
| **Phase ordering** (Pre-1 → 1 + 1.5 → 2 → 3 → 4 → 5 → 6 → 7 → R) | Unless customer commitments force re-ordering |

## What is **not** frozen (intentional)

| Layer | Why unfrozen |
|---|---|
| **UI surface specifications** | Approved Phase-1 mockups remain the visual direction; component-level details refine during implementation |
| **AI prompt registry contents** | Prompts iterate per use-case based on production results |
| **Phase 1 ticket internals** | Engineers may decompose tickets further |
| **Tenant branding accent algorithm constants** (clamps, etc.) | May tighten based on AA contrast measurements per tenant |
| **DataTable column packs per entity** | Refined per usage data |
| **Inbox notification taxonomy** | Refined per Phase 4 implementation |

## Release tag

```
foundation-v1.0
```

Per repo convention. Tag will be applied to the commit that contains:
- All Pre-Phase-1 code changes (IDOR fixes, env hardening, exception
  filter, resume scope, JWT null check, pagination DTOs)
- All Pre-Phase-1 migrations (Organization fields, audit append-only)
- All seven ADRs
- RLS PoC + Foundation Validation Gate + reports
- Ticket catalog

## Exit criteria — when can Foundation Freeze v1.0 be retired?

This freeze can be superseded by a future `foundation-v2.0` tag when:

1. RLS is live in production on every tenant table (Phase 1 `TF-1-2` done)
2. Transactional outbox + Redis Streams handling all events (Phase 1
   `TF-1-5`, `TF-1-6` done)
3. AI service infra (Phase 1.5) live with real AI Match in production
4. First DR drill completed with passing RTO/RPO
5. Audit hash-chain shipped (Phase 7 `TF-7-5`)

These do not block Phase 1 start. They mark the next foundation iteration.
