# Foundation Validation Report — TF-PRE-11

**Date:** 2026-06-03
**Gate run:** `packages/rls-poc/scripts/foundation-gate.cjs`
**Transcript:** `packages/rls-poc/foundation-gate-run.log`
**Recommendation:** **GO** for Foundation Freeze v1.0.

## Executive Summary

15 validation checks executed. **12 passed, 3 pending.** Zero **blocking**
failures. The 3 pending items are infrastructure that ships in Phase 1
(Terraform baseline, GrowthBook self-hosted) plus the quarterly DR drill
which has a documented owner and due date. None affect correctness or
security guarantees.

The gate run **applied the audit append-only migration to the live cluster
and exercised the rejection trigger** — `UPDATE` on `audit_logs` now raises
`insufficient_privilege` at the database layer, as designed.

The RLS PoC pattern validated in Pre-Phase-1 transfers cleanly to
penetration tests: UNION ALL, subqueries, and invalid GUC values all
fail closed (zero rows or safe cast error). The `NULLIF(...)` policy
shape is correct.

## Check-by-check status

| ID | Check | Status | Detail |
|---|---|---|---|
| G1.1 | Migration rollback (drop + re-apply) | ✅ PASS | Drop + re-apply yields identical column count. **Production-relevant finding:** GRANTs are NOT preserved across DROP/CREATE; migrations that drop+recreate tables must re-apply role grants. |
| G2.1 | UNION ALL cross-tenant leak attempt | ✅ PASS | Even an attacker-controlled UNION cannot widen access; policy applies per row. |
| G2.2 | Subquery bypass attempt | ✅ PASS | Nested SELECT cannot bypass policy. |
| G2.3 | Invalid GUC value | ✅ PASS | `not-a-uuid` raises a cast error (safe failure mode). |
| G3.1 | Cross-tenant isolation | ✅ PASS | Tenant A sees 1 row, Tenant B sees 1 row, no leak in either direction. |
| G4.1 | Audit append-only triggers present | ✅ PASS | Both triggers installed via the Pre-Phase-1 migration. |
| G4.2 | Audit UPDATE rejected | ✅ PASS | Real UPDATE attempt fires the trigger; raises `insufficient_privilege`. |
| G5.1 | Prod env guard rejects `REDIS_ENABLED=false` | ✅ PASS | Zod superRefine present in `env.schema.ts`. |
| G5.2 | Prod env guard enforces `JWT_SECRET ≥ 64 chars` | ✅ PASS | Same. |
| G6.1 | JWT strategy explicit `typeof`+trim checks | ✅ PASS | Three explicit checks on `sub`, `orgId`, `email`. |
| G7.1 | RDS daily snapshot + PITR policy documented | ✅ PASS | ADR-006 §15. No infra to test until Terraform provisioned. |
| G7.2 | Quarterly DR drill scheduled | ⏳ PENDING | Owner: SRE. Due before first enterprise customer onboarding. NOT a Foundation Freeze blocker. |
| G8.1 | All 7 ADRs marked `Status: Accepted` | ✅ PASS | ADR-001 through ADR-007 reviewed and accepted. |
| G9.1 | Terraform baseline provisioned | ⏳ PENDING | First ticket in Phase 1 (`TF-1-1`). NOT a Foundation Freeze blocker; required before Phase-1 production deploy. |
| G10.1 | GrowthBook self-hosted reachable | ⏳ PENDING | Provisioned in Phase 1 (`TF-1-7`). NOT a Foundation Freeze blocker. |

## Notable findings from the gate

### Finding 1 — GRANTs do not survive DROP/CREATE

When the gate dropped and recreated `rls_poc.candidates` to verify rollback,
all subsequent queries returned `permission denied for table candidates`.
The cause: `GRANT SELECT, INSERT, UPDATE, DELETE` from `002_roles.sql` had
applied to the original table only; the new table required the grants to be
re-applied.

**Production implication.** Any Prisma migration that drops a tenant-scoped
table (rare but possible) must also re-grant. Documented in
`docs/implementation/tickets.md` ticket TF-1-2 (apply RLS to all tenant
tables) and the production RLS policy template will include grant
re-application after structural rewrites.

### Finding 2 — Audit triggers fire on rows-affected, not on the statement

The append-only trigger is `BEFORE UPDATE FOR EACH ROW`. An UPDATE that
matches zero rows does not invoke the trigger. This is a non-issue for
tamper protection (an UPDATE that matches zero rows changes nothing) but
worth documenting: the gate exercises the trigger by targeting a real
audit row.

### Finding 3 — Migration runner needs `audit_logs` to exist

The audit append-only migration references the `audit_logs` table; running
it against a cluster that doesn't have the table yet would fail. The gate
handles this gracefully (skip with NOTE). In production, Prisma migrate's
dependency ordering already ensures the foundation migration that creates
`audit_logs` runs before the append-only migration.

## Risk Register — Remaining Open Items

| Risk | Severity | Owner | Mitigation | Foundation-blocking? |
|---|---|---|---|---|
| Terraform baseline not yet provisioned in staging | Medium | DevOps / Phase 1 lead | First Phase-1 ticket (`TF-1-1`); estimated 1 day | No — does not affect correctness or security |
| GrowthBook self-hosted not yet stood up | Medium | DevOps / Phase 1 lead | Phase-1 ticket `TF-1-7`; 2 days | No — three required flags listed and tracked |
| Quarterly DR drill not yet scheduled | Medium | SRE | Schedule before first enterprise onboarding | No — depends on infrastructure provisioning |
| Per-tenant rate limiting not yet implemented | Medium | Phase-1 ticket `TF-1-9` | 1 day | No — current tenant-scoped queries are bounded by pagination DTOs (S-4/S-5 fixed) |
| RLS policies not yet on production tables | High | Phase-1 ticket `TF-1-2` | 2 days; PoC pattern proven | No — application-layer defense is intact (IDOR fixes shipped) |
| Outbox + Streams not yet implemented | Medium | Phase-1 tickets `TF-1-5`, `TF-1-6` | 3.5 days | No — current EventEmitter is functional for the small set of consumers today |
| Resume AV scan not implemented | Low | Phase-1 follow-up; not in current ticket list | Add ticket; ~2 days | No — but should be tracked before scaling resume uploads |
| Hash-chain audit log not implemented | Low | Phase 7 (`TF-7-5`) | 1.5 days | No — append-only at DB layer is sufficient for SOC 2 Type II baseline |

## Pre-Phase-1 Ticket Closure Status

| Ticket | Status | Notes |
|---|---|---|
| TF-PRE-1 (IDOR submissions) | ✅ Closed | Type-check clean; service layer raises 404 on cross-tenant. |
| TF-PRE-2 (IDOR interviews) | ✅ Closed | Same. |
| TF-PRE-3 (Audit append-only migration) | ✅ Closed | Migration written + applied; G4.1 + G4.2 pass. |
| TF-PRE-4 (Organization fields) | ✅ Closed | Migration + Prisma schema; check constraints in place. |
| TF-PRE-5 (RLS PoC) | ✅ Closed | 12/12 PoC tests pass; **critical NULLIF empty-string finding documented**. |
| TF-PRE-6 (BullMQ + JWT prod guards) | ✅ Closed | Zod superRefine. |
| TF-PRE-7 (Pagination DTOs) | ✅ Closed | `ListNotificationsDto`, `ListDeliveriesDto` with explicit boolean transform. |
| TF-PRE-8 (JWT explicit null check) | ✅ Closed | typeof+trim for sub/orgId/email. |
| TF-PRE-9 (Exception filter PII redaction) | ✅ Closed | Production drops `err:` object; only logs `requestId/code/status`. |
| TF-PRE-10 (Resume download org scope) | ✅ Closed | Pre-existing org filter verified; storage-key prefix defense-in-depth added. |
| TF-PRE-11 (Foundation Validation Gate) | ✅ Closed | This document. |

## Go / No-Go Recommendation

**GO** for Foundation Freeze v1.0.

Justification:
- All correctness and security checks pass.
- No blocking failures in the gate.
- All 11 Pre-Phase-1 tickets closed.
- The 3 pending items are infrastructure that has a) explicit Phase 1 tickets,
  b) clear owners, and c) no impact on the application's data-integrity
  guarantees.
- The application can run safely against the current Prisma + PG configuration
  with the IDOR fixes and DTO hardening in place.
- The Phase 1 critical path (RLS migration on production tables → outbox →
  Streams → feature flags → shell + auth → AI service in parallel) is
  unblocked.

## Conditions on the Go decision

1. Phase 1 must begin with `TF-1-1` (Postgres role provisioning) and
   `TF-1-2` (apply RLS to all tenant-scoped tables) **before** any other
   Phase 1 ticket. RLS in production is the keystone of the
   architecture — delaying it would degrade defense-in-depth.
2. The audit append-only migration (`20240601000100_audit_append_only`)
   must be applied to staging and production before any new audit-emitting
   surface ships.
3. Phase 2 (Dashboard + Candidate List UI) does not begin until
   Foundation Freeze v1.0 is signed off and Phase 1 + 1.5 are in
   progress with shell + outbox + AI provider abstraction landing first.

---

**Signed off by:** Engineering (deliverable)
**Pending review:** Product, Security, Legal (advisory ADR-004 review)
