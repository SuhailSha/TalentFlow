# ADR-007 — GDPR & Data Lifecycle Strategy
Status: Accepted
Date: 2026-06-03

## Context

TalentFlow processes PII at scale: candidate names, emails, phone numbers,
resumes (which often contain birthdate, address, family information),
interview feedback, salary, work authorization, and AI-generated
summaries that may concentrate the most sensitive of the above.

We will sell to EU customers. We will be a "processor" under GDPR
(Article 28) and our customers ("controllers") will rely on us for:

- **Right of access** (Article 15) — produce a copy of a data subject's data
- **Right to erasure** (Article 17) — "right to be forgotten"
- **Right to rectification** (Article 16) — correct inaccurate data
- **Right to data portability** (Article 20) — machine-readable export
- **Storage limitation** (Article 5(1)(e)) — retention policy
- **Data residency** — EU customers expect EU data plane
- **Sub-processor disclosure** — AI providers, cloud providers
- **Breach notification** (Article 33) — 72-hour notification path

Today, **none of this is implemented**. Deletes are soft; data is kept
indefinitely; cross-border transfer protections for AI providers are
unaudited; there is no DSAR endpoint.

## Decision

### 1. Per-tenant retention policy

`Organization` carries a `retentionPolicy: jsonb` field:

```
{
  candidatesYears: 7,                  // hard-delete inactive candidates after N years
  resumesYears: 7,                     // hard-delete resume files after N years (separate to support legal-hold scenarios)
  auditLogsMonths: 18,                 // default; longer for placements/offers (kept 7 years)
  notificationsMonths: 12,
  aiUsageLogsMonths: 24,
  exportArtifactsDays: 30,
  deletionGracePeriodDays: 30          // soft → hard delete delay
}
```

Defaults satisfy SOC 2 and GDPR. Tenants can shorten via Settings → Audit
(Phase 7). They cannot extend beyond regulatory caps without admin
escalation.

The retention policy field ships in Pre-Phase-1 even though the UI to
edit it ships in Phase 7. This ensures existing data has a retention
scaffolding when policies turn on.

### 2. Two-stage deletion

Every delete operation is **soft-delete first** (`deletedAt` timestamp on
the row), then **hard-delete via background worker** after
`deletionGracePeriodDays`.

The hard-delete worker (Phase 7) processes daily:

```
DELETE FROM candidates
WHERE deletedAt IS NOT NULL
  AND deletedAt < now() - INTERVAL '{deletionGracePeriodDays} days'
```

Cascade through related tables: notes, skills, submissions metadata,
interview feedback, resume versions (file purge in S3 too), AI cache
entries, AI usage logs.

**Audit log is excluded from cascade.** Audit entries reference the
deleted candidate by id; the audit table itself keeps its retention
policy (longer, for compliance). Identifying fields in audit metadata are
**hash-replaced** at deletion time — `candidateEmail: "alice@example.com"`
becomes `candidateEmail_hash: "sha256:…"`. This satisfies GDPR's
"erasure" obligation (Recital 26) by removing identifying linkage while
preserving the immutable audit trail.

### 3. Right of access (DSAR) endpoint

`POST /candidates/:id/data-export` (admin-gated, audited) produces a
ZIP containing:

- `candidate.json` — full candidate record with PII
- `notes.json` — all notes (recruiter + system)
- `submissions/` — one JSON per submission
- `interviews/` — one JSON per interview + feedback
- `resumes/` — files (original) + per-version extraction JSON
- `ai-summaries.json` — every AI output ever generated for this candidate
- `audit-trail.json` — all audit entries naming this candidate
- `README.txt` — schema explanation in plain language

Generated as a BullMQ job; signed URL emailed to requester (TTL 24 hours).
Audit entry recorded for each export (who, when, why).

### 4. Right to erasure (anonymization)

`POST /candidates/:id/forget` performs **anonymization**, not deletion:

- Candidate PII fields replaced with `[redacted]` or hash
- Resume files purged from S3 (versions deleted; bucket lifecycle
  enforces immediate purge for these)
- AI cache entries deleted
- AI usage logs anonymized (`subjectId` hashed)
- Notes containing the candidate's name redacted via regex pass + manual
  review for first 100 chars per note
- Audit entries' identifying fields hash-replaced

The candidate row itself is **kept** — its `id` may be referenced from
submissions and audit. The row carries a `forgottenAt` timestamp and
returns 404 to any non-admin query.

This is the GDPR-recommended pattern: erasure-by-anonymization preserves
statistical integrity (placement rates, etc.) while severing identifying
linkage.

### 5. Right to rectification

Standard `PATCH /candidates/:id` already supports correction. The
rectification API is just the existing UPDATE flow. Audit entries record
the change, including the `before` and `after` values — these are
themselves subject to retention.

### 6. Right to portability

Same as §3 (DSAR endpoint). The JSON format is the machine-readable
export. Field names follow JSON Resume schema where applicable for
interoperability.

### 7. Data residency: regional deployments

For EU customers, TalentFlow runs a separate `eu-west-1` deployment. The
`Organization.dataRegion` field determines which deployment serves a
given tenant. The application code is **identical** between regions; only
deployment topology differs.

DNS routing: `<workspace-slug>.talentflow.app` → CNAME → region-specific
ALB. Determined at workspace creation.

Cross-region data movement is **prohibited**:

- Backups stay in the region
- DR replicas stay in the region
- AI provider calls are routed to in-region endpoints (Gemini EU,
  OpenAI EU, Anthropic EU) for EU tenants

Phase R deliverable. Until then, all data is in `us-east-1`. EU
customers cannot be onboarded.

### 8. Audit retention exception

Per §2, audit logs are **excluded** from regular retention cascade. They
follow their own retention (default 18 months; 7 years for financial
events like placement and offer).

After retention period, audit logs are archived to S3 Glacier with a
hash chain (ADR-003) preserving evidence integrity. Restorable for legal
hold scenarios.

### 9. AI provider sub-processor disclosure

Maintained in `/legal/sub-processors.md` (Phase 7):

- AWS (infrastructure)
- Vercel (frontend hosting; no candidate PII in the SSR layer)
- Postmark (transactional email; recipient addresses only)
- Google Gemini (AI inference; resume content + interview notes)
- OpenAI (AI inference; same)
- Anthropic (AI inference; same)

Customers can opt out of AI providers individually via the Organization
settings. Opting out of all three falls back to `RuleBasedProvider`
(ADR-004 §8).

### 10. Sub-processor agreements

DPAs in place with all sub-processors before they are enabled in
production. Customer DPA template references our sub-processor list and
commits to 30-day notice for additions.

### 11. Breach notification

Operational runbook in `/docs/security/breach-runbook.md` (Phase 7):

- Detection sources: Sentry, OpenTelemetry alerts, customer report
- Triage SLA: 1 hour from detection
- Containment + assessment SLA: 4 hours
- Notification to affected customers: within 24 hours of confirmation
- Notification to supervisory authority (Article 33): within 72 hours
  if it meets the threshold

### 12. Cookie & analytics consent

The frontend ships with a cookie consent banner (Phase 1) gating
analytics. Until the banner accepts, only strictly-necessary cookies
(session, CSRF) are set. Honors Do Not Track.

### 13. Encryption posture

| Layer | At-rest | In-transit | Notes |
|---|---|---|---|
| Postgres | SSE-KMS | TLS 1.3 | Customer-managed KMS keys for BYOK (Phase 7) |
| Redis | TLS-only ElastiCache | TLS 1.3 | No customer data persisted in Redis beyond cache TTL |
| S3 (resumes) | SSE-S3 default, SSE-KMS for BYOK | TLS 1.3 | Per-object encryption |
| Application logs | KMS-encrypted CloudWatch | TLS 1.3 | PII scrubber applied pre-emit |
| Backups | SSE-KMS | TLS 1.3 | Same KMS key as primary |

## Consequences

### Positive

- Pipeline to SOC 2 Type II and EU customer compliance is explicit
- Tenants control their retention; lower legal exposure
- AI provider choice respects tenant compliance constraints
- Audit log evidence preserved through hash chain even after anonymization
- DSAR endpoints reduce manual support cost for EU requests

### Negative

- Anonymization is more complex than deletion. Edge cases in notes,
  attachments, AI summaries require careful regex + manual review path.
  We accept the operational cost as the cost of doing business in
  regulated markets.
- Multi-region deployment is significant infrastructure work (Phase R)
- AI provider opt-out reduces AI feature availability per tenant
- Retention defaults are conservative; customers may push back

### Neutral

- Some fields (e.g., AI usage log `subjectId`) become opaque hashes after
  anonymization; analytics queries grouping by candidate become impossible
  for anonymized subjects. Accepted.

## Alternatives considered

**Hard-delete only, no anonymization** — rejected. Cascading deletes
through audit logs would break our compliance posture (audit must
survive). Anonymization is the standard GDPR-friendly pattern.

**Single-region forever** — rejected. EU customers will be a meaningful
revenue line within 18 months; data residency cannot be a procurement
blocker.

**Skip DSAR until requested** — rejected. The 30-day GDPR response
window is non-negotiable. Building it reactively under deadline
is risky and expensive.

**Retain everything forever** — rejected. Violates GDPR Article 5(1)(e);
unbounded storage cost; legal liability growth.

## References

- ADR-002 (audit is RLS-scoped per tenant)
- ADR-003 (events trigger retention worker)
- ADR-004 (AI provider opt-out)
- ADR-006 (regional deployment topology)
- GDPR full text: https://gdpr-info.eu/
