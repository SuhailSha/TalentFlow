import { ConfigService } from '@nestjs/config';
import { Global, type DynamicModule, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';

import { OutboxRelayWorker } from './outbox-relay.worker';
import { OutboxService } from './outbox.service';
import { STREAMS_REDIS, StreamsPublisher } from './streams.publisher';
import { StreamsConsumerRegistry } from './streams-consumer.registry';

/**
 * EventsModule — TF-1-5 + TF-1-6 plumbing.
 *
 * Provides:
 *   - OutboxService — emit events inside business transactions
 *   - OutboxRelayWorker — polls outbox, publishes to Redis Streams
 *   - StreamsPublisher — XADD wrapper + tenant pub/sub fan-out
 *   - StreamsConsumerRegistry — consumer-group helper for handlers
 *
 * Redis connection: a dedicated ioredis instance, separate from BullMQ's
 * connection pool. Streams consumers may block on XREADGROUP for seconds
 * at a time, which would saturate a shared connection; isolating it
 * keeps queue jobs responsive.
 *
 * When REDIS_ENABLED=false, the Redis client provider returns null and
 * the publisher / worker degrade gracefully (logged warnings, no
 * throws). Production rejects this config via env.schema super-refine.
 */

const logger = new Logger('EventsModule');

@Global()
@Module({})
export class EventsModule {
  static register(): DynamicModule {
    const redisEnabled = process.env['REDIS_ENABLED'] === 'true';

    return {
      module: EventsModule,
      providers: [
        OutboxService,
        StreamsPublisher,
        StreamsConsumerRegistry,
        OutboxRelayWorker,
        {
          provide: STREAMS_REDIS,
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            if (!redisEnabled) {
              logger.warn(
                'STREAMS_REDIS: REDIS_ENABLED=false — outbox relay will buffer rows in Postgres until Redis is enabled.',
              );
              return null;
            }
            const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
            const client = new Redis(url, {
              maxRetriesPerRequest: null,            // Streams consumers may block long; never abort
              enableReadyCheck: true,
              retryStrategy: (times) => Math.min(times * 200, 2000),
              // Distinct from BullMQ pool so XREADGROUP blocking doesn't
              // starve job processing.
              connectionName: 'streams',
            });
            client.on('connect',   () => logger.log('STREAMS_REDIS connected'));
            client.on('error',     (err) => logger.error('STREAMS_REDIS error', err));
            return client;
          },
        },
      ],
      exports: [
        OutboxService,
        StreamsPublisher,
        StreamsConsumerRegistry,
        OutboxRelayWorker,
      ],
    };
  }
}
