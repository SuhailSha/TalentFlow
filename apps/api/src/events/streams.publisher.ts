import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit, Optional } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * StreamsPublisher — publishes events to Redis Streams (ADR-003 Layer 2).
 *
 * Stream naming: one stream per event type, prefixed with the tenant id
 * for per-tenant cleanup / quotas.
 *   `t:{orgId}:events:{eventType}` — durable, consumed via consumer groups
 *
 * For the outbox-relay use case, the stream is per event type WITHOUT a
 * tenant prefix:
 *   `events:{eventType}` — global stream; tenant is in the message body
 * This is because consumers (e.g., audit-writer) need to see events from
 * all tenants — they fan out themselves.
 *
 * REDIS_ENABLED=false: methods become no-ops with a warn log so dev
 * environments without Redis still function (worker simply doesn't
 * publish; outbox rows accumulate until Redis is available).
 *
 * Production binding requires Redis. The env-schema guard in
 * `env.schema.ts` rejects REDIS_ENABLED=false in production.
 */

export const STREAMS_REDIS = Symbol('STREAMS_REDIS');

@Injectable()
export class StreamsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamsPublisher.name);

  constructor(@Optional() @Inject(STREAMS_REDIS) private readonly client: Redis | null) {}

  async onModuleInit(): Promise<void> {
    if (!this.client) {
      this.logger.warn('StreamsPublisher: REDIS_ENABLED=false — publishes will be no-ops');
      return;
    }
    // Health probe: PING. If this throws, NestJS reports the module as
    // unhealthy; orchestrator decides whether to crashloop.
    try {
      await this.client.ping();
      this.logger.log('StreamsPublisher connected');
    } catch (err) {
      this.logger.error('StreamsPublisher: Redis ping failed', err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }

  /**
   * Publish a single event message to its event-type stream.
   *
   * Returns the Redis Stream ID assigned to the message (e.g.
   * "1717398501123-0"), or null if Redis is unavailable.
   *
   * Failure handling is up to the caller. The outbox relay worker retries
   * with backoff and writes `last_error` + `attempts++` on failure; it
   * does NOT mark the outbox row published until this call returns.
   */
  async publish(
    eventType: string,
    message: Record<string, string>,
  ): Promise<string | null> {
    if (!this.client) return null;

    // XADD <stream> * <k1> <v1> <k2> <v2> ...
    // The '*' tells Redis to auto-generate the ID.
    // Stream entry fields are all strings; we serialize the payload
    // outside this function.
    const fields: string[] = [];
    for (const [k, v] of Object.entries(message)) {
      fields.push(k, v);
    }
    const id = await this.client.xadd(streamKey(eventType), '*', ...fields);
    return id;
  }

  /**
   * Per-tenant pub/sub fan-out for live UI updates (SSE).
   * Separate from the durable Streams; consumers use Redis PUBSUB.
   * Lossy by design — if a browser is disconnected, it re-queries on
   * reconnect. We don't durably queue UI-tick events.
   */
  async pubsubFanout(orgId: string, channel: string, payload: string): Promise<void> {
    if (!this.client) return;
    await this.client.publish(tenantChannel(orgId, channel), payload);
  }
}

/** Stream key for a global (cross-tenant) event type. */
export function streamKey(eventType: string): string {
  return `events:${eventType}`;
}

/** Pub/sub channel for per-tenant UI fan-out. */
export function tenantChannel(orgId: string, channel: string): string {
  return `t:${orgId}:${channel}`;
}
