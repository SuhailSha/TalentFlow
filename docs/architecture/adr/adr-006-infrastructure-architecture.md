# ADR-006 — Infrastructure Architecture
Status: Accepted
Date: 2026-06-03

## Context

Production infrastructure has not been chosen. Today the app runs locally
on Windows with embedded Postgres and a sync-fallback BullMQ. Before any
customer-facing deploy, we need an opinionated stack that:

- Supports SOC 2 Type II controls
- Allows EU data residency (future)
- Operates at single-engineer scale today; scales to ~100 tenants without
  re-architecture
- Keeps a single primary cloud to minimize bandwidth + observability cost

## Decision

### 1. Cloud provider

**AWS primary**. Single justification: managed Postgres (RDS), managed
Redis (ElastiCache), managed object storage (S3), KMS, Secrets Manager,
and ECS are all first-class. The only exception is hosting Next.js on
Vercel (§3), which is justified by performance + DX advantages too
large to ignore.

### 2. Topology

```
                  Cloudflare (WAF, DDoS, edge cache, custom domain)
                         │
                    ┌────┴─────────────┐
                    ▼                  ▼
            Vercel (Next.js)    apps/api ALB
                    │                  │
                    └────────┬─────────┘
                             ▼
                  Fargate ECS service: NestJS API (2–N tasks)
                  Fargate ECS service: outbox-relay (1 task)
                  Fargate ECS service: workers (parsing/ai/audit/indexer)
                             │
                ┌────────────┼─────────────┐
                ▼            ▼             ▼
              RDS Postgres  ElastiCache    S3
              (Multi-AZ)    Redis          (resumes, exports, audit)
              + PgBouncer   (cache,
              sidecar       streams,
                            bullmq)
```

Sub-second internal latency for API ↔ DB ↔ Redis (all in the same VPC AZ).

### 3. Frontend hosting: Vercel

The `apps/web` Next.js app deploys to Vercel. Why an exception to
AWS-primary:

- Next.js on Vercel is significantly faster (ISR + Edge Functions natively
  supported; self-hosted equivalents require custom infrastructure)
- Preview deploys per PR are free and instant
- Bandwidth costs sit inside Vercel's pricing rather than separate
  CloudFront + S3 billing
- Reduced operational surface — no Next.js cold-start tuning, no Docker
  image builds for the frontend

Trade-off accepted: Vercel is a single-tenant vendor for the frontend.
If Vercel becomes prohibitive at scale, the Next.js app is portable to
self-hosted (no Vercel-specific APIs). The migration cost is bounded.

### 4. Backend hosting: AWS Fargate ECS

The `apps/api` NestJS app runs as a Fargate task definition. Three
services:

- `api` — HTTP traffic from ALB
- `outbox-relay` — single-instance (with leader election via Redis lock if
  we need HA); polls outbox and publishes to streams
- `workers` — multiple task families: `worker-parsing`, `worker-ai`,
  `worker-audit`, `worker-indexer`, `worker-notifications`

Each task family has its own auto-scaling policy. Parsing scales on
BullMQ queue depth; AI scales on cost-meter request rate; audit scales
on stream lag.

Container images built in GitHub Actions; pushed to ECR; deployed via
ECS rolling update.

### 5. Database

**RDS PostgreSQL 16**, Multi-AZ, with a PgBouncer sidecar on each API
task or as a dedicated Fargate service.

- PgBouncer mode: **transaction pooling** (ADR-002 §3)
- Backup: automated daily snapshot + 5-minute PITR; 35-day retention
- Read replicas: provisioned in Phase 5 when analytical query load
  warrants
- KMS encryption at rest (AWS-managed key by default; BYOK Phase 7)

### 6. Cache + queue: ElastiCache Redis

Single Redis cluster, multi-AZ, used for:

- Application cache (workspace aggregations, permission maps)
- Event streams (Redis Streams; ADR-003)
- BullMQ queues (parsing, AI, audit, notifications)
- Pub/sub fan-out for SSE (ADR-003 §5)
- Rate limit counters (per-tenant + per-user)

Tenant-prefixed keys (ADR-001 §rec). Encrypted at rest + in transit.

### 7. Object storage: S3

Buckets:

- `talentflow-resumes` — resume files (private; per-tenant prefix)
- `talentflow-exports` — CSV/PDF exports (signed URL TTL 5 min;
  per-tenant prefix; lifecycle to Glacier-IR at 30 days)
- `talentflow-audit-archive` — daily audit log dumps (write-once;
  lifecycle to Glacier at 90 days)
- `talentflow-backups` — Postgres logical dumps for cross-region DR

Encryption: SSE-S3 by default; SSE-KMS with customer-managed keys for
BYOK tenants (ADR-004 §10, Phase 7).

Versioning enabled on `resumes` (recovery from accidental delete) and
`audit-archive` (compliance evidence).

### 8. Email

**Postmark** for transactional email. SES considered but Postmark's
deliverability + DX wins for low volume. Switch to SES at scale.

### 9. CDN + WAF: Cloudflare

All HTTPS traffic enters via Cloudflare:

- WAF rulesets for OWASP Top 10
- Rate limiting (cloud-edge layer; the app layer also rate-limits per
  tenant, see ADR-001)
- DDoS mitigation
- Custom domain SSL

Cloudflare Workers reserved for future edge logic (e.g., per-tenant
domain routing).

### 10. Secrets

**AWS Secrets Manager**. Application config in `.env` files (committed
without secrets); runtime resolution of secrets via IAM-bound task role.
Rotated quarterly (SOC 2 requirement). No secret committed to git, ever.

### 11. Observability

**OpenTelemetry** instrumentation across NestJS + Next.js. Exporters:

- Traces → **Honeycomb** (preferred) or **Tempo** (self-hosted backup)
- Metrics → **Prometheus + Grafana** (self-hosted on AWS Managed Grafana)
- Logs → **Loki** or Datadog Logs (decision deferred; budget-driven)
- Errors → **Sentry** (frontend + backend; PII scrubber configured)
- AI cost → custom Prometheus metrics + Honeycomb derived columns

Per-request correlation: `request-id` propagated via `traceparent` header
(W3C Trace Context). Background jobs inherit context via job metadata.

### 12. CI/CD

**GitHub Actions** with Turborepo remote cache.

- PR: lint, type-check, unit tests, affected-build, axe accessibility
  check, OpenAPI compat check
- PR preview: Vercel for web; ephemeral Fargate service for API
- Main merge → auto-deploy to staging
- Manual gate → production deploy

Database migrations run as a separate ECS task **before** the API task
update. Health check on the API task fails if Prisma's schema version
doesn't match the expected version, preventing skewed deploys.

Smoke tests post-deploy: Playwright run against staging (~2 min) and
prod (~30 sec subset).

### 13. Infrastructure as Code: Terraform

All cloud resources managed via Terraform. State in S3 + DynamoDB lock.
One module per environment (`dev`, `staging`, `prod`, `dr`). Drift
detection runs nightly; opens a PR if drift detected.

Anything not in Terraform doesn't exist. Console changes are rolled
back at the next drift check.

### 14. Environments

| Environment | Purpose | Data | Topology |
|---|---|---|---|
| `dev` | Engineer machines | Synthetic + opt-in seed | Embedded PG, local Redis, mocked AI |
| `staging` | Shared QA | Synthetic, weekly refresh | Same as prod, smaller instance sizes |
| `prod` | Customers | Real | Multi-AZ, autoscaling |
| `dr` | Disaster recovery (Phase 7) | Replica of prod | Warm standby in `eu-west-1`, manual failover |

Production data **never** copies to non-prod environments without
anonymization (ADR-007).

### 15. Disaster recovery

- RTO target: **1 hour** (database + API up; full functionality restored)
- RPO target: **5 minutes** (Postgres PITR granularity)
- Quarterly DR drill: restore prod PITR snapshot into the `dr` stack,
  run smoke tests, document actual vs target. Failure to meet targets
  triggers infrastructure review.

### 16. Cost controls

- Per-environment AWS budget alerts at 50%, 80%, 100%
- Tags on every resource: `Environment`, `Component`, `CostCenter`
- AI provider costs tracked separately (ADR-004 §7) and rolled up to
  tenant billing (Phase 7)

## Consequences

### Positive

- Single primary cloud reduces operational surface
- All Phase-1 platform plumbing (events, RLS, caching, observability) maps
  cleanly to the topology
- SOC 2 evidence is straightforward — AWS Artifact + Vercel SOC 2 reports
  available
- Vercel exception isolated to the frontend; backend remains portable

### Negative

- AWS lock-in. Migration to GCP or Azure is non-trivial. Acceptable risk
  given multi-cloud's operational cost.
- Vercel pricing is per-build + per-bandwidth. At >50k MAU we re-evaluate
  self-hosted Next.js.
- Terraform is a competency requirement for any DevOps hire. Onboarding
  cost.

## Alternatives considered

**Fly.io for everything** — rejected. Excellent DX but missing the
managed Postgres/Redis/S3 maturity AWS provides. Reconsider if AWS
operational cost becomes prohibitive.

**Kubernetes (EKS)** — rejected for current scale. ECS Fargate operates
with one-tenth the cognitive overhead and zero cluster maintenance.
Revisit at 50+ engineers.

**Google Cloud** — rejected primarily for ecosystem alignment with
SOC 2 auditors and security-engineering hires we've spoken with.

**Self-hosted Next.js on ECS** — rejected; performance + DX gap justifies
the Vercel exception.

## References

- ADR-001, ADR-002, ADR-003 (all assume this topology)
- ADR-007 (data residency for EU customers)
