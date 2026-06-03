# ADR-003 — Event Architecture
Status: Accepted
Date: 2026-06-03

## Context

The current implementation uses in-process `EventEmitter2` for domain
events. The `AuditService` listens via wildcard `@OnEvent('**')` and writes
to `audit_logs`. Future needs:

- Notifications fan out from a single status change to multiple recipients
- AI cache invalidation must trigger on data updates
- Inbox unread counts must update across tabs / users in near real-time
- Webhook delivery to customer endpoints
- Workspace metric aggregations refresh from many event types

In-process events fail four ways at scale:
1. Lost on crash (no durability)
2. Lost across instances (no fan-out)
3. No retry (transient handler failures vanish)
4. No transactional consistency (event emitted but transaction rolls back)

## Decision

Adopt a **transactional outbox + Redis Streams** architecture, with three
layers:

### Layer 1: Transactional outbox

Every domain event is written to a Postgres `outbox` table **in the same
transaction** as the business write. This guarantees:

- If the business transaction commits, the event row exists
- If the business transaction rolls back, the event is gone
- Order is preserved per `aggregateId` via `outbox.sequenceNum`

Schema:

```
outbox (
  id            uuid PK,
  organizationId uuid (RLS-scoped),
  aggregateType text,
  aggregateId   uuid,
  eventType     text,
  payload       jsonb,
  sequenceNum   bigserial,
  createdAt     timestamptz,
  publishedAt   timestamptz  -- null until published
)
```

### Layer 2: Outbox relay → Redis Streams

A dedicated worker process polls the `outbox` table every 500ms for rows
where `publishedAt IS NULL`. For each row, it:

1. Publishes to the Redis Stream `events:{eventType}`
2. Updates `publishedAt = now()`

If publishing fails, the row stays unpublished and is retried on the next
poll. The worker uses `SELECT … FOR UPDATE SKIP LOCKED` to allow multiple
relay instances to share load without conflict.

**Consumers receive at-least-once delivery.** All event handlers must be
idempotent.

### Layer 3: Consumers

Two consumer patterns:

- **Internal handlers**: NestJS standalone worker processes that subscribe
  via Redis Streams consumer groups. Examples: `audit-writer`,
  `notification-fan-out`, `ai-cache-invalidator`, `webhook-dispatcher`,
  `search-indexer`.
- **Live UI updates**: SSE per tenant. Each API instance subscribes to a
  Redis pub/sub channel `tenant:{orgId}:events` and forwards relevant
  events to connected browser clients. Redis pub/sub (not Streams) is used
  here because we don't need durability for live UI — if the browser missed
  a tick, it re-queries.

### Layer 4: DLQ + retries

Each consumer applies bounded retry: 3 attempts with exponential backoff.
Permanent failures land in `dlq:{queueName}` Redis stream, which alerts
Slack `#ops-alerts` and is reviewed nightly. A `dlq-replay` admin tool
allows re-emitting from the DLQ once the bug is fixed.

### Layer 5: SSE topology

Browser ↔ API: `GET /events/stream` opens an SSE connection. The endpoint
authenticates via cookie, reads tenant from JWT, subscribes to the
appropriate Redis pub/sub channel, and forwards events as SSE frames.

API instances subscribe to the same channel. Redis pub/sub fans events to
all subscribers. This means a status change made on instance A is visible
to a browser connected to instance B within < 100ms.

WebSocket is **rejected** for now. SSE is sufficient for our needs (one-way,
server-to-client), simpler to operate, traverses corporate proxies better,
and uses standard HTTP/2 semantics.

## Event taxonomy

Three categories. Naming convention: `<aggregate>.<verb>.<tense>`.

| Category | Examples | Durable? | Live UI? |
|---|---|---|---|
| **Domain** | `candidate.status.changed`, `submission.advanced` | Yes (outbox) | Yes (SSE) |
| **System** | `parsing.completed`, `ai.cache.invalidated` | Yes | Optional |
| **Telemetry** | `page.viewed`, `feature.used` | No (direct to analytics) | No |

Telemetry events bypass the outbox and stream directly to the analytics
pipeline (Phase 7). They are explicitly low-trust; no business logic
depends on them.

## Idempotency

Every consumer handler **must** be idempotent. The standard implementation
patterns:

- Use the event's `id` as a deduplication key (`processed_events` table)
- Use upserts instead of inserts
- Make state transitions monotonic (status moves forward only)

The `audit-writer` consumer uses the event `id` as the primary key of the
audit row, so re-delivery cannot duplicate audit entries.

## Consequences

### Positive

- Crash-safe: no event is ever lost
- Scales horizontally: relay and consumers all use SKIP LOCKED / consumer
  groups, so adding instances increases throughput
- Live UI updates without polling
- Auditable: every event has a row in `outbox` with a timestamp
- Consumer failures are visible in the DLQ, not silent

### Negative

- Eventual consistency: a domain action commits → event appears in outbox
  → relay publishes → consumer processes. Total latency: 1–3 seconds
  typical, 30 seconds tail. Acceptable for everything except the action
  itself (which is synchronous).
- More infrastructure: Redis Streams adds a moving part beyond Postgres.
- Idempotency discipline required in every consumer. Code review checklist
  item.

### Neutral

- The outbox table grows. Nightly cleanup deletes rows older than 7 days
  where `publishedAt IS NOT NULL`.

## Alternatives considered

**Direct Postgres LISTEN/NOTIFY** — rejected. No persistence; lost on
restart. No consumer groups; one listener gets one notification.

**Apache Kafka** — rejected for current scale. The operational cost (ZooKeeper
or KRaft, replication, partitions) is unjustified below ~5k events/sec.
Revisit at 1M-candidate band per ADR-001 §scaling.

**NATS JetStream** — viable alternative. We already run Redis for cache +
BullMQ, so a single Streams binding wins on operational simplicity. Revisit
if Redis becomes a bottleneck.

**Synchronous fan-out (call all handlers inline)** — rejected. Slow,
fragile, no retries, no auditability.

**Webhooks to customer endpoints in the same process** — rejected.
Webhooks live as a consumer of the event bus, isolated from business
transactions. Customer endpoint slowness cannot block our writes.

## References

- ADR-001 (multi-tenancy: events carry `organizationId`)
- ADR-004 (AI events: cache invalidation)
- ADR-005 (search indexer is an event consumer)
