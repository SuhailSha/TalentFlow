import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

import { QUEUE_NAMES } from './queue.constants';

/**
 * Possible states reported by ioredis on the shared BullMQ connection.
 *
 *  wait         — created but not yet started
 *  connecting   — TCP handshake in progress
 *  connect      — socket established; AUTH/SELECT pending
 *  ready        — fully operational
 *  reconnecting — was connected, dropped, retrying
 *  end / close  — connection closed (final or transient)
 */
export type RedisConnectionState =
  | 'wait'
  | 'connecting'
  | 'connect'
  | 'ready'
  | 'reconnecting'
  | 'end'
  | 'close'
  | 'unknown';

export interface RedisConnectionStatus {
  /** Whether REDIS_ENABLED=true and a queue handle exists. */
  enabled:            boolean;
  /** Current ioredis state. `unknown` when disabled or before bootstrap. */
  state:              RedisConnectionState;
  /** When the client most recently reached `ready` state. */
  lastConnectedAt:    string | null;
  /** When the connection most recently dropped. */
  lastDisconnectedAt: string | null;
  /** Most recent ioredis error message (truncated). */
  lastErrorMessage:   string | null;
  /** Cumulative reconnect attempts since boot. */
  reconnectCount:     number;
}

/**
 * Listens to the shared BullMQ Redis client and exposes the latest
 * connection state for operational visibility. Reconnect attempts are
 * counted (ioredis fires reconnecting events repeatedly during outages),
 * but log noise is throttled so a Redis outage doesn't fill the pino
 * stream.
 *
 * Safe when Redis is disabled — the @Optional queue handle resolves to
 * undefined and the monitor reports enabled=false / state=unknown.
 */
@Injectable()
export class RedisConnectionMonitor
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(RedisConnectionMonitor.name);

  private state:               RedisConnectionState = 'unknown';
  private lastConnectedAt:     Date | null          = null;
  private lastDisconnectedAt:  Date | null          = null;
  private lastErrorMessage:    string | null        = null;
  private reconnectCount       = 0;
  private listenersAttached    = false;

  constructor(
    @Optional() @InjectQueue(QUEUE_NAMES.NOTIFICATION_EMAIL)
    private readonly queue?: Queue,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.queue) {
      this.logger.log('Redis disabled — connection monitor inactive.');
      return;
    }

    try {
      const client = (await this.queue.client) as Redis;
      this.attachListeners(client);

      // Sync initial state from the existing client. By the time
      // onApplicationBootstrap fires, BullMQ has typically already connected.
      const status = client.status as RedisConnectionState | undefined;
      if (status === 'ready') {
        this.state = 'ready';
        this.lastConnectedAt = new Date();
        this.logger.log('Redis client ready');
      } else if (status) {
        this.state = status;
        this.logger.log(`Redis client current state: ${status}`);
      }
    } catch (err) {
      this.logger.error({ err }, 'Failed to attach Redis connection monitor');
    }
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    if (!this.queue) return;
    this.logger.log(
      { signal, state: this.state, reconnectCount: this.reconnectCount },
      'API shutting down — BullMQ worker drain handled by NestJS shutdown hooks',
    );
  }

  /** Snapshot for the queue health endpoint. */
  getStatus(): RedisConnectionStatus {
    return {
      enabled:            !!this.queue,
      state:              this.state,
      lastConnectedAt:    this.lastConnectedAt?.toISOString()    ?? null,
      lastDisconnectedAt: this.lastDisconnectedAt?.toISOString() ?? null,
      lastErrorMessage:   this.lastErrorMessage,
      reconnectCount:     this.reconnectCount,
    };
  }

  private attachListeners(client: Redis): void {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    client.on('connect', () => {
      this.state = 'connect';
    });

    client.on('ready', () => {
      const wasReconnecting = this.state === 'reconnecting' || this.state === 'end' || this.state === 'close';
      this.state = 'ready';
      this.lastConnectedAt = new Date();
      if (wasReconnecting) {
        this.logger.log({ reconnectCount: this.reconnectCount }, 'Redis client ready (recovered)');
      } else {
        this.logger.log('Redis client ready');
      }
    });

    client.on('reconnecting', (delayMs: number) => {
      this.state = 'reconnecting';
      this.reconnectCount += 1;
      // Throttle to first attempt + every 10th to avoid log flooding during
      // sustained outages.
      if (this.reconnectCount === 1 || this.reconnectCount % 10 === 0) {
        this.logger.warn(
          { delayMs, reconnectCount: this.reconnectCount },
          'Redis client reconnecting',
        );
      }
    });

    client.on('error', (err: Error) => {
      this.lastErrorMessage = String(err.message ?? err).slice(0, 500);
      // Suppress repeat errors once we know we're disconnected — ioredis
      // emits an error per failed reconnect attempt.
      if (this.state !== 'reconnecting' && this.state !== 'end' && this.state !== 'close') {
        this.logger.error({ err: { message: err.message } }, 'Redis client error');
      }
    });

    client.on('end', () => {
      this.state = 'end';
      this.lastDisconnectedAt = new Date();
      this.logger.warn('Redis client connection ended');
    });

    client.on('close', () => {
      // 'close' fires immediately when the socket closes; 'end' fires after
      // all retry attempts give up. Treat both as disconnected but only log
      // once (end already logged).
      if (this.state !== 'end') {
        this.state = 'close';
        this.lastDisconnectedAt = new Date();
      }
    });
  }
}
