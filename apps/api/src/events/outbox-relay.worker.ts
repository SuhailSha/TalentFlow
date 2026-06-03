import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { PrismaAdminService } from '../database';
import { StreamsPublisher } from './streams.publisher';

/**
 * OutboxRelayWorker — polls unpublished outbox rows and publishes them
 * to Redis Streams. ADR-003 Layer 2.
 *
 * ── Retry strategy ────────────────────────────────────────────────────
 * Rows where `published_at IS NULL` are picked up on every poll. If the
 * publish fails (Redis down, network blip, etc.), the row stays
 * unpublished; the worker increments `attempts`, records `last_error`,
 * and tries again on the next tick. There is no hard retry limit at the
 * row level: a permanently-failed event is far worse than a slowly-
 * retrying event. Alerting on rows where `attempts > 10` is a Phase 7
 * operator surface.
 *
 * ── Idempotency at the publisher level ───────────────────────────────
 * Each outbox row publishes exactly one message to the stream, identified
 * by the outbox row's UUID (`eventId` field in the stream entry).
 * Consumers dedup on this id (per-consumer `processed_events` table or
 * in-memory LRU). At-least-once delivery is the contract; consumers must
 * be idempotent. This is documented in ADR-003 §Idempotency.
 *
 * ── Concurrency safety ────────────────────────────────────────────────
 * Multiple worker instances can run in parallel: the SELECT … FOR UPDATE
 * SKIP LOCKED pattern lets each instance grab a disjoint slice of
 * unpublished rows. Without SKIP LOCKED, two instances would block on
 * the same rows.
 *
 * ── Cross-tenant access ──────────────────────────────────────────────
 * The worker uses `prismaAdmin` (BYPASSRLS) because it must read the
 * outbox across all tenants. Per-tenant filtering happens after the
 * read; consumers receive events tagged with the originating tenant.
 *
 * ── Failure modes covered (TF-1-5 spec) ──────────────────────────────
 *   1. Redis down: publish returns null → row stays unpublished →
 *      retried on next tick. attempts++ + last_error recorded.
 *   2. Worker crash mid-batch: rows whose published_at is still NULL
 *      get picked up on next worker start. The SKIP LOCKED guards
 *      against double-publish during the brief moment when two
 *      workers might both think a row is theirs.
 *   3. Postgres slow / stalled: poll waits, next tick fires after
 *      the current tick completes. POLL_INTERVAL_MS caps frequency.
 *   4. Stream backed up / slow consumer: not the relay's concern.
 *      Streams are bounded externally by maxlen options on XADD if
 *      needed (deferred).
 *   5. Malformed payload (impossible with our schema but for paranoia):
 *      JSON.stringify wraps; serialization errors caught and logged.
 */

const POLL_INTERVAL_MS = 500;
const BATCH_SIZE = 50;

@Injectable()
export class OutboxRelayWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopping = false;
  // Visible for telemetry. Phase 1.8 will wire to Prometheus.
  private metrics = {
    polled: 0,
    published: 0,
    failed: 0,
    lastTickAt: 0,
    lastErrorAt: 0,
  };

  constructor(
    private readonly admin:  PrismaAdminService,
    private readonly streams: StreamsPublisher,
  ) {}

  async onModuleInit(): Promise<void> {
    // Skip in test or when explicitly disabled. In dev with REDIS_ENABLED=false,
    // the worker still polls but the publisher is a no-op — outbox rows
    // accumulate harmlessly until Redis is available.
    if (process.env['OUTBOX_RELAY_DISABLED'] === 'true') {
      this.logger.warn('OutboxRelayWorker: OUTBOX_RELAY_DISABLED=true; not starting');
      return;
    }
    this.logger.log('OutboxRelayWorker: starting');
    this.scheduleNext();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    // Wait briefly for an in-flight tick to finish.
    for (let i = 0; this.running && i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    this.logger.log('OutboxRelayWorker: stopped');
  }

  /** Internal: schedule the next tick. */
  private scheduleNext(): void {
    if (this.stopping) return;
    this.timer = setTimeout(() => this.tick().catch((e) => this.logger.error('Tick error', e)),
      POLL_INTERVAL_MS);
  }

  /** Visible for tests. Runs one batch and returns the result. */
  async tick(): Promise<{ polled: number; published: number; failed: number }> {
    if (this.running || this.stopping) {
      // Re-enqueue and bail; never overlap ticks.
      this.scheduleNext();
      return { polled: 0, published: 0, failed: 0 };
    }
    this.running = true;
    const tickStart = Date.now();
    const result = { polled: 0, published: 0, failed: 0 };

    try {
      // Fetch a batch of unpublished rows. The SKIP LOCKED ensures
      // multiple relay instances share work without conflicting.
      // We use $queryRaw to take advantage of FOR UPDATE SKIP LOCKED,
      // which Prisma's typed API does not expose directly.
      const rows = await this.admin.$queryRaw<Array<{
        id: string;
        organization_id: string;
        aggregate_type: string;
        aggregate_id: string;
        event_type: string;
        payload: unknown;
        correlation_id: string | null;
        attempts: number;
      }>>`
        SELECT id, organization_id, aggregate_type, aggregate_id,
               event_type, payload, correlation_id, attempts
          FROM outbox_events
         WHERE published_at IS NULL
         ORDER BY sequence_num ASC
         LIMIT ${BATCH_SIZE}
         FOR UPDATE SKIP LOCKED
      `;

      result.polled = rows.length;
      this.metrics.polled += rows.length;

      for (const row of rows) {
        try {
          const messageId = await this.streams.publish(row.event_type, {
            eventId:        row.id,
            organizationId: row.organization_id,
            aggregateType:  row.aggregate_type,
            aggregateId:    row.aggregate_id,
            eventType:      row.event_type,
            payload:        JSON.stringify(row.payload ?? {}),
            correlationId:  row.correlation_id ?? '',
            // Helps consumers debug if needed.
            emittedAt:      new Date().toISOString(),
          });

          if (messageId === null) {
            // Redis disabled / unreachable. Bump attempts and move on;
            // next tick will retry.
            await this.admin.$executeRaw`
              UPDATE outbox_events
                 SET attempts   = attempts + 1,
                     last_error = ${'Redis publisher returned null (REDIS_ENABLED=false or unreachable)'}
               WHERE id = ${row.id}::uuid
            `;
            result.failed++;
            this.metrics.failed++;
          } else {
            // Success: mark published. Use NOW() to record actual publish
            // time, not when the row was created.
            await this.admin.$executeRaw`
              UPDATE outbox_events
                 SET published_at = now(),
                     last_error   = NULL
               WHERE id = ${row.id}::uuid
            `;
            result.published++;
            this.metrics.published++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await this.admin.$executeRaw`
            UPDATE outbox_events
               SET attempts   = attempts + 1,
                   last_error = ${msg.slice(0, 1000)}
             WHERE id = ${row.id}::uuid
          `;
          result.failed++;
          this.metrics.failed++;
          this.metrics.lastErrorAt = Date.now();
          // Don't re-throw — one bad event must not poison the whole batch.
          this.logger.error(`Outbox publish failed for ${row.id}`, err);
        }
      }

      this.metrics.lastTickAt = tickStart;
      if (result.polled > 0) {
        this.logger.debug(
          `tick: polled=${result.polled} published=${result.published} failed=${result.failed}`,
        );
      }
    } catch (err) {
      // Catastrophic error (e.g. DB unavailable). Log and continue;
      // next tick may succeed.
      this.logger.error('Outbox tick failed', err);
    } finally {
      this.running = false;
      this.scheduleNext();
    }

    return result;
  }

  /** For tests and the /health endpoint. */
  getMetrics() {
    return { ...this.metrics };
  }
}
