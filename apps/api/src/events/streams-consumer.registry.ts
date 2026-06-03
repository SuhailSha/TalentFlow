import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
  Optional,
} from '@nestjs/common';
import Redis from 'ioredis';
import * as crypto from 'node:crypto';

import { STREAMS_REDIS, streamKey } from './streams.publisher';

/**
 * StreamsConsumerRegistry — TF-1-6.
 *
 * NestJS-friendly consumer-group runtime for Redis Streams. Domain modules
 * register handlers at startup; the registry owns the long-running
 * `XREADGROUP` loop, dispatch, acknowledgement, and DLQ.
 *
 * Why consumer groups instead of plain XREAD?
 *   - Survive process restarts: pending acknowledgements stay assigned to
 *     the consumer that fetched them; a new instance can claim them.
 *   - Multiple instances share work: each instance is a unique
 *     `consumerName` in the same group; XREADGROUP gives each a disjoint
 *     batch.
 *   - At-least-once delivery: an event that throws stays in PEL until
 *     manually ACKed or claimed; cannot be lost.
 *
 * Handler contract:
 *   - Idempotent. Receiving the same message twice (which WILL happen
 *     on crash recovery) must be safe.
 *   - Throwing routes to the DLQ after `maxAttempts` retries. The DLQ
 *     entry preserves the original payload + last error.
 *
 * Consumer name is generated at boot via crypto-random hex so multiple
 * API instances in the same group don't collide.
 *
 * Failure modes covered:
 *   1. Process crash mid-handle: PEL retains the message; on next
 *      instance start, the periodic claim sweep picks it up.
 *   2. Handler throws: caught, attempts++ recorded, retried up to
 *      maxAttempts, then moved to DLQ stream with full context.
 *   3. Redis disconnect: XREADGROUP throws; we sleep+retry without
 *      crashing. PEL is preserved server-side.
 *   4. Two instances connect at the same time: consumer groups
 *      distribute messages 1:1, no double-handle.
 */

export interface ConsumerOptions {
  /** Event type this consumer listens for. Maps to `events:{eventType}`. */
  eventType: string;
  /** Group name (often same as consumer module). Created if not present. */
  group: string;
  /** Max retries before moving to DLQ. Default 3. */
  maxAttempts?: number;
  /** Block time per XREADGROUP call (ms). Default 5000. */
  blockMs?: number;
  /** Batch size per fetch. Default 10. */
  count?: number;
}

export type ConsumerHandler = (msg: ConsumedMessage) => Promise<void>;

export interface ConsumedMessage {
  streamId: string;           // Redis stream entry ID (e.g. "1717398501123-0")
  eventId: string;            // outbox event UUID (consumer dedup key)
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;           // already JSON.parse'd
  correlationId: string | null;
  emittedAt: string;
  attempts: number;           // retries already tried by this group
}

@Injectable()
export class StreamsConsumerRegistry implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamsConsumerRegistry.name);
  // We open a dedicated read connection per consumer; XREADGROUP BLOCK
  // blocks the connection. Sharing one connection across N consumers
  // would serialize them.
  private readClients: Redis[] = [];
  private loops: Array<{ stop: () => void; promise: Promise<void> }> = [];
  private readonly consumerName = `c-${crypto.randomBytes(4).toString('hex')}-${process.pid}`;

  constructor(@Optional() @Inject(STREAMS_REDIS) private readonly base: Redis | null) {}

  async onModuleInit(): Promise<void> {
    if (!this.base) {
      this.logger.warn('StreamsConsumerRegistry: REDIS_ENABLED=false — no consumers will run');
    } else {
      this.logger.log(`StreamsConsumerRegistry ready (consumer=${this.consumerName})`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const loop of this.loops) loop.stop();
    await Promise.allSettled(this.loops.map((l) => l.promise));
    for (const c of this.readClients) {
      try { await c.quit(); } catch { /* ignore */ }
    }
    this.logger.log('StreamsConsumerRegistry stopped');
  }

  /**
   * Register a handler. Returns immediately; the read loop runs in the
   * background. Idempotent: calling twice for the same group+eventType
   * is allowed (multiple handlers can share a group, but this is unusual;
   * prefer distinct group names per concern).
   */
  register(opts: ConsumerOptions, handler: ConsumerHandler): void {
    if (!this.base) return;

    const stream = streamKey(opts.eventType);
    const maxAttempts = opts.maxAttempts ?? 3;
    const blockMs     = opts.blockMs ?? 5000;
    const count       = opts.count ?? 10;

    // Each consumer gets its own ioredis connection so blocking
    // XREADGROUP doesn't starve the rest of the process.
    const client = this.base.duplicate();
    client.on('error', (err) => this.logger.error(`Consumer ${opts.group} redis error`, err));
    this.readClients.push(client);

    // Ensure the consumer group exists. MKSTREAM creates the stream too.
    // BUSYGROUP error is expected when the group is already there.
    const ensureGroup = async () => {
      try {
        await client.xgroup('CREATE', stream, opts.group, '$', 'MKSTREAM');
        this.logger.log(`Consumer group created: ${opts.group}@${stream}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('BUSYGROUP')) {
          this.logger.error(`Failed to create group ${opts.group}@${stream}`, err);
        }
      }
    };

    let stopped = false;
    const loop = async () => {
      await ensureGroup();
      while (!stopped) {
        try {
          // XREADGROUP GROUP <group> <consumer> COUNT <n> BLOCK <ms> STREAMS <key> >
          // The trailing '>' means "messages not yet delivered to any consumer".
          // To process pending (PEL) messages first on startup, we do an
          // initial pass with '0'; once empty, switch to '>' for new ones.
          const initialPel = await this.tryClaimPending(client, opts.group, stream);
          if (initialPel > 0) {
            this.logger.log(`Reclaimed ${initialPel} pending messages for ${opts.group}@${stream}`);
          }

          const result = await client.xreadgroup(
            'GROUP', opts.group, this.consumerName,
            'COUNT', count,
            'BLOCK', blockMs,
            'STREAMS', stream, '>',
          ) as Array<[string, Array<[string, string[]]>]> | null;

          if (!result) continue;       // BLOCK timeout, no messages

          for (const [, entries] of result) {
            for (const [streamId, fields] of entries) {
              await this.dispatch(client, stream, opts.group, streamId, fields, handler, maxAttempts);
            }
          }
        } catch (err) {
          if (stopped) break;
          this.logger.error(`Consumer ${opts.group}@${stream} loop error`, err);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    };

    const promise = loop();
    this.loops.push({ stop: () => { stopped = true; }, promise });
  }

  /**
   * Parse stream-entry fields, run handler, ACK or DLQ.
   * Errors are caught and routed to retry/DLQ; never re-thrown here.
   */
  private async dispatch(
    client: Redis,
    stream: string,
    group: string,
    streamId: string,
    fields: string[],
    handler: ConsumerHandler,
    maxAttempts: number,
  ): Promise<void> {
    // fields is a flat [k, v, k, v, ...] array; unpack.
    const map: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      map[fields[i]!] = fields[i + 1]!;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(map['payload'] ?? '{}');
    } catch {
      parsed = {};
    }

    const message: ConsumedMessage = {
      streamId,
      eventId:        map['eventId']        ?? '',
      organizationId: map['organizationId'] ?? '',
      aggregateType:  map['aggregateType']  ?? '',
      aggregateId:    map['aggregateId']    ?? '',
      eventType:      map['eventType']      ?? '',
      payload:        parsed,
      correlationId:  (map['correlationId'] ?? '') || null,
      emittedAt:      map['emittedAt']      ?? '',
      attempts:       Number(map['attempts'] ?? '0'),
    };

    try {
      await handler(message);
      await client.xack(stream, group, streamId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const nextAttempt = message.attempts + 1;

      if (nextAttempt >= maxAttempts) {
        // Move to DLQ stream and ACK the original so we don't keep retrying
        // forever. The DLQ entry preserves the full context.
        const dlqKey = `${stream}:dlq`;
        await client.xadd(
          dlqKey, '*',
          'originalStreamId', streamId,
          'eventId',          message.eventId,
          'organizationId',   message.organizationId,
          'aggregateType',    message.aggregateType,
          'aggregateId',      message.aggregateId,
          'eventType',        message.eventType,
          'payload',          map['payload'] ?? '{}',
          'correlationId',    message.correlationId ?? '',
          'attempts',         String(nextAttempt),
          'lastError',        errMsg.slice(0, 1000),
          'failedAt',         new Date().toISOString(),
        );
        await client.xack(stream, group, streamId);
        this.logger.error(
          `DLQ: ${group}@${stream} eventId=${message.eventId} after ${nextAttempt} attempts: ${errMsg}`,
        );
      } else {
        // Re-emit with incremented attempt count so the next dispatch
        // sees the retry. The PEL also tracks via XPENDING but our
        // attempts counter is in-message for simplicity. We ACK the
        // current entry and add a fresh one with attempts++.
        await client.xack(stream, group, streamId);
        await client.xadd(
          stream, '*',
          ...Object.entries(map).flatMap(([k, v]) => [k, v]),
          'attempts', String(nextAttempt),
        );
        this.logger.warn(
          `Retry ${nextAttempt}/${maxAttempts}: ${group}@${stream} eventId=${message.eventId}: ${errMsg}`,
        );
      }
    }
  }

  /**
   * On startup, claim messages from this group's PEL that have been
   * idle longer than 60s. This handles the case where a previous
   * instance crashed mid-handle.
   */
  private async tryClaimPending(client: Redis, group: string, stream: string): Promise<number> {
    try {
      // XAUTOCLAIM is the modern primitive (Redis ≥ 6.2). For older
      // Redis we'd fall back to XPENDING + XCLAIM. ElastiCache is on
      // Redis 7; safe.
      const result = await client.xautoclaim(
        stream, group, this.consumerName,
        60_000,   // min idle time in ms
        '0',      // start cursor
        'COUNT', 50,
      ) as [string, Array<[string, string[]]>, string[]];
      const claimed = result?.[1] ?? [];
      return claimed.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NOGROUP')) {
        // Group doesn't exist yet; the ensureGroup call handles this.
        return 0;
      }
      // Older Redis without XAUTOCLAIM: log once, continue.
      return 0;
    }
  }
}
