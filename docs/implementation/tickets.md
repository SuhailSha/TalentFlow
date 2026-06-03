# TalentFlow — Implementation Tickets

Tickets are grouped by phase and bound to the ADRs they implement. Each
ticket has: ID · type · estimate · dependencies · acceptance criteria.

**Ticket types:** `feature` (new capability) · `chore` (infra/tooling) ·
`migration` (schema/data) · `tech-debt` (cleanup) · `security`
(security-critical work) · `spike` (research).

**Estimates** are in person-days assuming a single engineer. Multiply for
parallelism overhead. A "0.5" means half a day. Anything > 5 should be
split.

**Status legend:** `□ open`  `▣ in progress`  `■ done`

---

## Pre-Phase-1 — Foundation Hardening

> Goal: production-ready substrate before any customer-facing feature.
> Implementation has begun (see commits / file changes referenced below).

### TF-PRE-1 — Fix IDOR in submissions repository · `security` · 0.5d · ■ done
- Add `organizationId` parameter to `submissions.repository.update/softDelete`.
- Switch to `updateMany`; null/false return ⇒ NotFoundException at service.
- Files: `apps/api/src/modules/submissions/{submissions.repository.ts, submissions.service.ts}`
- Implements: ADR-001, ADR-002
- Acceptance: type-check clean; cross-tenant update returns 404; existing tests pass.

### TF-PRE-2 — Fix IDOR in interviews repository · `security` · 0.5d · ■ done
- Add `organizationId` to `update/softDelete`; `interviewId` to `updateFeedback`.
- Files: `apps/api/src/modules/interviews/{interviews.repository.ts, interviews.service.ts}`
- Implements: ADR-001, ADR-002

### TF-PRE-3 — Audit table append-only at DB level · `security` · 0.5d · ■ done
- New migration `20240601000100_audit_append_only/migration.sql`.
- `REVOKE UPDATE, DELETE` from app role; defense-in-depth triggers.
- Implements: ADR-007 §8

### TF-PRE-4 — Organization fields (branding/AI/retention/region) · `migration` · 1d · ■ done
- Migration `20240601000000_org_branding_ai_retention/migration.sql`.
- Prisma schema in `packages/database/prisma/schema/foundation.prisma`.
- Implements: ADR-006 (branding/region), ADR-004 (AI budget), ADR-007 (retention)
- Acceptance: existing rows get safe defaults; check-constraints reject out-of-range values.

### TF-PRE-5 — RLS Proof of Concept · `spike` · 2d · ■ done
- `packages/rls-poc/` with SQL, scripts, and 12-test battery.
- Surfaces `NULLIF(current_setting(...), '')` empty-string quirk (Finding 1 in REPORT.md).
- Implements: ADR-002 PoC requirement.
- Acceptance: 12/12 tests pass; REPORT.md documents findings; production policy template ready.

### TF-PRE-6 — BullMQ production guard · `security` · 0.5d · ■ done
- `env.schema.ts` super-refine: production rejects `REDIS_ENABLED=false`.
- Production also requires JWT_SECRET ≥ 64 chars.
- Implements: architecture review §14

### TF-PRE-7 — Rate-limit + pagination DTOs (S-4, S-5 from Phase 0B audit) · `security` · 1d · ■ done
- `ListNotificationsDto` + `ListDeliveriesDto` extend `PaginationDto`.
- Explicit boolean transform via `@Transform({ value }) => value === 'true' || value === '1'` (memory: `feedback_nestjs_boolean_env`).
- Communications DTO also adds `MaxLength` bounds on filter strings.
- Files: `apps/api/src/modules/notifications/{notifications.controller.ts, dto/list-notifications.dto.ts}`,
  `apps/api/src/modules/communications/{communications.controller.ts, dto/list-deliveries.dto.ts}`

### TF-PRE-8 — JWT validate explicit null check (S-6 from Phase 0B audit) · `security` · 0.25d · ■ done
- `auth/strategies/jwt.strategy.ts`: replace truthiness check with `typeof X !== 'string' || X.trim().length === 0` for `sub`, `orgId`, `email`.

### TF-PRE-9 — Global exception filter PII redaction (S-7 from Phase 0B audit) · `security` · 0.5d · ■ done
- `common/filters/global-exception.filter.ts`: in production, log only `{ requestId, code, status }`. Stack and exception object dropped.
- Dev unchanged.

### TF-PRE-10 — Resume download organization scope (S-3 from Phase 0B audit) · `security` · 0.5d · ■ done
- Verified `resumes.service.ts:download()` calls `findVersionById(versionId, organizationId)`.
- Defense-in-depth: storage-key prefix asserted to start with `organizationId`. Misconfigured storage cannot serve cross-tenant bytes.
- Documented as security-sensitive op; OTel span tagging is a Phase-1 follow-up (`TF-1-8`).

### TF-PRE-11 — Foundation Validation Gate · `chore` · 1d · ■ done
- Runnable harness at `packages/rls-poc/scripts/foundation-gate.cjs`.
- 15 checks across 10 dimensions; 12 pass, 3 pending infra (non-blocking).
- Surfaced two production-relevant findings: GRANTs don't survive DROP/CREATE; audit triggers fire per-row not per-statement.
- Report: `docs/implementation/foundation-validation-report.md`
- Milestone: `docs/implementation/foundation-freeze-v1.0.md`

**Pre-Phase-1 status: 11 done / 0 open · 0d remaining ✅ Foundation Freeze v1.0**

---

## Phase 1 — Application Shell + Auth + Design + Platform Plumbing

> Effort: ~16 days · Depends on: Pre-Phase-1 complete.

### TF-1-1 — Postgres role provisioning (Terraform) · `chore` · 1d · □
- Define `app_tenant`, `app_admin`, `app_migrations`, `app_audit_archiver` roles in IaC.
- Implements: ADR-002 §7, ADR-006 §13

### TF-1-2 — Apply RLS policies to all tenant-scoped tables · `security` · 2d · □
- For every model with `organizationId`: enable + force RLS; add policy using `NULLIF(...)` pattern per PoC REPORT.md.
- Models: Candidate, Job, Submission, Interview, Vendor, Reminder, Resume, Review, Duplicate, Notification, AuditLog, AIResult (when created), Outbox (when created), etc.
- Acceptance: PoC test pattern adapted per model; all pass.

### TF-1-3 — Prisma RLS middleware · `chore` · 2d · □
- `apps/api/src/database/rls.middleware.ts` wraps every query in transaction + `SET LOCAL app.current_org_id`.
- Reads from `AsyncLocalStorage` populated by request guard + job worker.
- Throws when AsyncLocalStorage is unset (refuses to query without tenant).
- Implements: ADR-002 §2

### TF-1-4 — Admin Prisma client (`prismaAdmin`) · `chore` · 0.5d · □
- Connects as `app_admin` role; bypasses RLS; calls audited via OTel.
- Implements: ADR-002 §5

### TF-1-5 — Outbox table + worker · `chore` · 2d · □
- Schema: `outbox(id, organizationId, aggregateType, aggregateId, eventType, payload, sequenceNum, createdAt, publishedAt)`.
- Worker polls every 500ms with `FOR UPDATE SKIP LOCKED`; publishes to Redis Stream `events:{eventType}`.
- Implements: ADR-003 Layer 1, Layer 2

### TF-1-6 — Redis Streams consumer infrastructure · `chore` · 1.5d · □
- Consumer-group helper in `apps/api/src/events/`.
- Wire `audit-writer` consumer (replaces in-process EventEmitter for AuditService).
- DLQ + retry policy.
- Implements: ADR-003 Layers 3, 4

### TF-1-7 — Feature flag SDK (GrowthBook self-hosted) · `chore` · 2d · □
- Server-side SDK in NestJS via `@Inject(FEATURE_FLAGS)`.
- Client-side SDK in Next.js with hydration-safe `useFlag(name)` hook.
- Targeting axes: orgId, userId, role, plan.
- Define first 3 flags: `ai_features_enabled`, `data_table_v2`, `reports_module`.
- Implements: architecture review §2

### TF-1-8 — OpenTelemetry instrumentation · `chore` · 2d · □
- NestJS auto-instrumentation: HTTP, Prisma, Axios, ioredis.
- Next.js Sentry SDK + Web Vitals.
- Trace context propagation into BullMQ jobs (via job metadata).
- Implements: ADR-006 §11

### TF-1-9 — Per-tenant rate limiting · `security` · 1d · □
- `@nestjs/throttler` with custom keyGenerator using `organizationId`.
- Different limits per route: writes (60/min), reads (300/min), AI (per ADR-004 §7).

### TF-1-10 — Collapsible Sidebar + Workspace switcher · `feature` · 2d · □
- 240px expanded ↔ 56px collapsed; persisted in localStorage.
- Workspace switcher with popover (placeholder; backend in Phase 7).
- Resume Intelligence sidebar group.
- Reports group reserved (hidden until `reports_module` flag).
- Implements: Phase 0A blueprint §5.1–5.4

### TF-1-11 — Real Command Palette · `feature` · 1.5d · □
- Entity-prefix shortcuts (`c:`, `j:`, `s:`, `v:`, `i:`).
- Recent records section (server-backed).
- Jump-to actions + create actions.

### TF-1-12 — `/inbox` placeholder shell · `feature` · 0.5d · □
- Route stub + sidebar wiring; full implementation Phase 4.

### TF-1-13 — Forgot password flow · `feature` · 1d · □
- Backend `POST /auth/forgot-password` + signed token email.
- Frontend `/login/forgot` route.

### TF-1-14 — Density toggle · `feature` · 0.5d · □
- Cozy / Comfortable / Compact preference in avatar menu; persisted.

### TF-1-15 — Skip-to-content + a11y audit baseline · `feature` · 0.5d · □
- Verify skip link works; `jsx-a11y` eslint strict; axe-core in dev mode.

**Phase 1 total: ~20 days (parallelism reduces wall-clock)**

---

## Phase 1.5 — AI Service Foundation (parallel with Phase 1)

> Effort: ~14 days · Depends on: TF-PRE-4 (Organization AI fields), TF-1-5 (outbox)

### TF-1.5-1 — LlmProvider interface + GeminiProvider · `chore` · 2d · □
- Interface per ADR-004 §2. Gemini Flash adapter with structured output (JSON mode).
- Implements: ADR-004 §2

### TF-1.5-2 — OpenAiProvider · `chore` · 1d · □
- Same interface, GPT-4o-mini default model.

### TF-1.5-3 — AnthropicProvider · `chore` · 1d · □
- Claude 3.5 Sonnet default model.

### TF-1.5-4 — RuleBasedProvider · `feature` · 1d · □
- Deterministic non-LLM fallback per ADR-004 §8.

### TF-1.5-5 — Prompt registry · `chore` · 1.5d · □
- `apps/api/src/modules/ai/prompts/<use-case>/v{N}.ts` structure.
- Pinned model IDs; Zod response schemas; test fixtures.
- Implements: ADR-004 §3

### TF-1.5-6 — Context assembler · `chore` · 1.5d · □
- Builds prompt input from candidate + resume + notes + jobs.
- Computes `contextHash` (SHA-256).
- Anti-prompt-injection wrapping.
- Implements: ADR-004 §5

### TF-1.5-7 — AIResult cache table + lookup · `chore` · 1d · □
- Migration + repository per ADR-004 §6.

### TF-1.5-8 — AI cost meter (`AIUsageLog` table + writer) · `chore` · 1.5d · □
- Six dimensions per architecture review: tokens, dollar, provider, model, tenant, user.
- Per-tenant monthly rollup view.
- Implements: ADR-004 §7

### TF-1.5-9 — AI rate limiter + budget enforcement · `security` · 1d · □
- Per-user rate limit (default 100 calls/hour).
- Per-tenant monthly cap with soft (80%) + hard (100%) gates.

### TF-1.5-10 — AI cache invalidation consumer · `chore` · 1d · □
- Subscribes to events: `resume.version.created`, `note.added`, `submission.status.changed`.
- Marks `AIResult` rows expired.
- Implements: ADR-003, ADR-004 §6

### TF-1.5-11 — Provenance contract enforcement · `security` · 1d · □
- Provider boundary rejects responses missing `sources[]`.
- Logged to `AIUsageLog` as `status='rejected_no_provenance'`.
- Implements: ADR-004 §4

### TF-1.5-12 — Per-tenant AI opt-out (`Organization.aiEnabled`) · `feature` · 0.5d · □
- Middleware short-circuits AI endpoints when tenant disabled.
- Implements: ADR-004 §9

**Phase 1.5 total: ~14 days** — runs in parallel with Phase 1 + 2.

---

## Phase 2 — Dashboard + Candidate List

> Effort: ~14 days · Depends on: Phase 1 shell complete

### TF-2-1 — DataTable primitive · `feature` · 5d · □
- Generic over row type; column picker, filter chips, density, freeze, resize, sort, pagination, bulk bar, hover toolbar, drawer-open-row.
- Built on TanStack Table v8.
- Three empty-state variants; four loading-state tiers.
- Implements: Phase 0A blueprint §5.6

### TF-2-2 — Saved Views (localStorage) · `feature` · 1d · □
- Per-user view pills; "+ Save view" affordance.
- Phase 5 migrates to server-backed.

### TF-2-3 — Filter chip builder · `feature` · 1.5d · □
- Typed filters per column; URL-state shareable.

### TF-2-4 — Export to CSV · `feature` · 1.5d · □
- BullMQ job → S3 → signed URL.
- Audit log entry per export per Phase 0B audit.
- Implements: ADR-007 (audit on export)

### TF-2-5 — Convert Candidate list to DataTable · `feature` · 2d · □
- Column pack: name, AI match, status, stage, owner, skills, last touch.
- AI match column gated by `ai_features_enabled` flag.

### TF-2-6 — `/home` Dashboard · `feature` · 3d · □
- KPI strip (Open Jobs, Active Candidates, Interviews, Offers).
- AI Command Center (deterministic items first; AI items wire in from Phase 1.5).
- Pipeline strip + week calendar + collapsed metrics drawer.

---

## Phase 3 — Candidate Workspace (Flagship)

> Effort: ~12 days · Depends on: Phase 2 DataTable, Phase 1.5 AI service

### TF-3-1 — `RecordDrawer` + `DrawerHost` primitives · `feature` · 1.5d · □
- 720px right Sheet; renders any workspace.
- Stack support (drawer over drawer).

### TF-3-2 — Wire row-click drawer on every list · `feature` · 1d · □

### TF-3-3 — `WorkspaceShell` refinement · `chore` · 1d · □
- Sticky 88px header, sticky tabs, sticky 340px right rail, scrollable main.

### TF-3-4 — `<InlineEdit>` primitive · `feature` · 1.5d · □
- Click-to-edit, autosave-on-blur, optimistic + 80ms ack flash.

### TF-3-5 — `AICard` / `AIBadge` / `AIProvenance` / `MatchBar` / `ConfidenceRow` primitives · `feature` · 1d · □
- Implements: Phase 0A blueprint §5.5 (AI surfaces)

### TF-3-6 — AI Summary on Candidate Workspace · `feature` · 1.5d · □
- Wires to Phase 1.5 `summary` use case.
- Provenance hover citations.

### TF-3-7 — AI Match against open jobs · `feature` · 1.5d · □
- Top 4 jobs with bar visualization.
- "See AI rationale" deep-link.

### TF-3-8 — AI Risk Signals · `feature` · 1d · □

### TF-3-9 — AI Suggested Actions · `feature` · 1d · □

### TF-3-10 — Skills with confidence (Resume Intelligence integration) · `feature` · 1d · □

---

## Phase 4 — Inbox

> Effort: ~10 days · Depends on: Phase 1 outbox + Streams

### TF-4-1 — Notification model extensions (category, aiRationale, snoozed, archived) · `migration` · 0.5d · □
### TF-4-2 — Notification fan-out consumer · `chore` · 1.5d · □
### TF-4-3 — `/inbox` two-pane UI · `feature` · 2d · □
### TF-4-4 — Filter tabs (All / Mentions / Assigned / Watching) · `feature` · 1d · □
### TF-4-5 — Archive / snooze / mark-read with undo · `feature` · 1d · □
### TF-4-6 — Reply box with `⌘↵` and AI draft · `feature` · 1d · □
### TF-4-7 — SSE channel per tenant for live updates · `chore` · 1.5d · □
- Redis pub/sub fan-out per ADR-003 §5.
### TF-4-8 — Top-bar bell badge synced via SSE · `feature` · 0.5d · □
### TF-4-9 — Email delivery for high-priority items (opt-in) · `feature` · 1d · □

---

## Phase 5 — Jobs + Submissions + Interviews

> Effort: ~18 days

### TF-5-1 — Server-backed Saved Views (graduate from localStorage) · `feature` · 1.5d · □
### TF-5-2 — Saved View sharing scope (private/team/org) · `feature` · 1d · □
### TF-5-3 — Jobs list on DataTable · `feature` · 1d · □
### TF-5-4 — Job Workspace (Canonical template + Pipeline tab = kanban) · `feature` · 3d · □
### TF-5-5 — Submissions list on DataTable · `feature` · 1d · □
### TF-5-6 — Submissions Board view (kanban with drag-to-advance) · `feature` · 2d · □
### TF-5-7 — Submission Workspace · `feature` · 1.5d · □
### TF-5-8 — Interviews list on DataTable · `feature` · 1d · □
### TF-5-9 — Interviews Calendar view · `feature` · 2.5d · □
### TF-5-10 — Interview Workspace + Feedback scorecard · `feature` · 2d · □
### TF-5-11 — Vendors list + workspace · `feature` · 1.5d · □

---

## Phase 6 — Resume Intelligence + AI UI integration

> Effort: ~12 days

### TF-6-1 — `/resumes` modernized to DataTable · `feature` · 1d · □
### TF-6-2 — Review queue modernized · `feature` · 1.5d · □
### TF-6-3 — Duplicates modernized · `feature` · 1d · □
### TF-6-4 — `<ExtractionPreview>` side panel · `feature` · 1.5d · □
### TF-6-5 — Resume Intelligence card on Candidate Workspace (per-field confidence) · `feature` · 1d · □
### TF-6-6 — `/parsing-health` operator surface · `feature` · 1.5d · □
### TF-6-7 — Settings → Data → Extraction Configuration · `feature` · 2.5d · □
### TF-6-8 — Custom fields in Candidate edit form · `feature` · 1d · □
### TF-6-9 — Custom fields as DataTable columns · `feature` · 1d · □
### TF-6-10 — S3 lifecycle for resumes (archive after 12 months inactive) · `chore` · 0.5d · □

---

## Phase 7 — Enterprise + Compliance

> Effort: ~20 days

### TF-7-1 — Hard-delete worker (retention purge) · `feature` · 2d · □ — implements ADR-007 §2
### TF-7-2 — DSAR endpoint + admin UI · `feature` · 2d · □ — implements ADR-007 §3
### TF-7-3 — Right-to-be-forgotten anonymization · `feature` · 2d · □ — implements ADR-007 §4
### TF-7-4 — Audit log UI · `feature` · 2d · □
### TF-7-5 — Audit log hash chain · `security` · 1.5d · □ — implements ADR-007 §8
### TF-7-6 — Audit log S3 archival · `chore` · 1d · □ — implements ADR-007 §8
### TF-7-7 — SIEM webhook export · `feature` · 1d · □
### TF-7-8 — Tenant branding UI (Settings → Workspace → Branding) · `feature` · 1.5d · □
### TF-7-9 — Roles + Permissions matrix UI · `feature` · 2d · □
### TF-7-10 — SSO (Google + Microsoft) backend · `feature` · 2d · □
### TF-7-11 — SAML SSO · `feature` · 2d · □
### TF-7-12 — MFA (TOTP + recovery codes) · `security` · 1.5d · □
### TF-7-13 — API keys + webhooks · `feature` · 2d · □
### TF-7-14 — Reports module — Overview report (uses Workspace template) · `feature` · 2d · □
### TF-7-15 — Per-tenant cost dashboard (AI usage rollup) · `feature` · 1d · □
### TF-7-16 — Cookie consent banner · `feature` · 0.5d · □
### TF-7-17 — Status page integration · `chore` · 0.5d · □
### TF-7-18 — In-app changelog + help surface · `feature` · 1d · □

---

## Phase R — Multi-region + Platform mode (future, deferred)

### TF-R-1 — EU data plane Terraform + DNS routing · `chore` · 5d · □
### TF-R-2 — Tenant region selection on workspace creation · `feature` · 1d · □
### TF-R-3 — Platform mode shell · `feature` · 5d · □
### TF-R-4 — Cross-tenant operator surfaces · `feature` · 10d · □
### TF-R-5 — Tenant self-serve provisioning · `feature` · 5d · □

---

## Cumulative Effort Summary

| Phase | Tickets | Effort | Cumulative |
|---|---|---|---|
| Pre-Phase-1 | 10 (6 done) | 7d (1.5d remaining) | 7d |
| Phase 1 | 15 | ~20d | 27d |
| Phase 1.5 (parallel) | 12 | ~14d | 27d |
| Phase 2 | 6 | ~14d | 41d |
| Phase 3 | 10 | ~12d | 53d |
| Phase 4 | 9 | ~10d | 63d |
| Phase 5 | 11 | ~18d | 81d |
| Phase 6 | 10 | ~12d | 93d |
| Phase 7 | 18 | ~20d | 113d |
| Phase R | 5 | ~26d | 139d |

**Phase 1–7: ~113 working days** (single-engineer-day units; with the
recommended 1 designer + 3 engineers and parallel Phase 1.5, wall-clock
is ~22 working weeks ≈ 5 months).

## Decisions Required (Re-iterated for Tracking)

1. Cloud provider lock-in (AWS-default) — proposed ADR-006
2. AI provider mix (Gemini + OpenAI + Anthropic) — proposed ADR-004
3. Feature flag tool (GrowthBook self-hosted) — proposed
4. SOC 2 Type II target date
5. EU customer commitment / Phase R timing
6. Sandbox tenant provisioning automation (Phase 1 yes/no)
7. BYOK premium tier landing phase

---

**Pre-Phase-1 implementation complete in this turn. Phases 1+ tickets are
ready to claim.** Awaiting product/engineering planning to start Phase 1
implementation against the tickets above.
