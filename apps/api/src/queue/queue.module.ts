import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { type DynamicModule, Logger, Module } from '@nestjs/common';

import type { EnvConfig } from '../config';
import { QUEUE_NAMES } from './queue.constants';
import { QueueHealthIndicator } from './queue.health';

/**
 * QueueModule — BullMQ / Redis queue infrastructure.
 *
 * Architecture decisions:
 *
 *  1. REDIS_ENABLED guard:
 *     The module is conditionally skipped when REDIS_ENABLED=false (the dev default
 *     when Redis is not running locally). This prevents BullMQ connection errors
 *     from crashing the API during development. Set REDIS_ENABLED=true when Redis
 *     is running (see docker-compose.yml or local Redis install instructions).
 *
 *  2. All queues pre-registered:
 *     Every queue is registered at startup via BullModule.registerQueue().
 *     This creates the queue's Redis keyspace immediately and makes the Queue
 *     token injectable anywhere in the app. Workers activate the queue; the
 *     registration itself is lightweight.
 *
 *  3. Global module:
 *     QueueModule is @Global() so any module can inject a Queue by name
 *     without re-importing QueueModule. Pattern:
 *       @InjectQueue(QUEUE_NAMES.RESUME_PARSE) private queue: Queue
 *
 *  4. Connection sharing:
 *     BullModule.forRootAsync() creates a single shared ioredis connection
 *     pool. Each queue does NOT create its own connection — they share the
 *     root connection. BullMQ internally uses one connection for the queue
 *     client and one for each active worker.
 *
 *  5. Dead letter strategy:
 *     Failed jobs (after all retries) remain in the queue's `failed` set.
 *     A dedicated CleanupWorker will periodically purge old failed jobs
 *     according to the removeOnFail config in DEFAULT_JOB_OPTIONS.
 *
 * Testing:
 *   In unit tests: pass REDIS_ENABLED=false — queue module becomes a no-op.
 *   In integration tests: use a real Redis (testcontainers or CI service).
 *   Never mock BullMQ queues — mock the service layer that calls queue.add().
 */

const logger = new Logger('QueueModule');

@Module({})
export class QueueModule {
  static register(): DynamicModule {
    const redisEnabled = process.env['REDIS_ENABLED'] === 'true';

    if (!redisEnabled) {
      logger.warn(
        'REDIS_ENABLED=false — BullMQ queues disabled. ' +
        'Set REDIS_ENABLED=true and start Redis to enable job processing.',
      );
      return {
        module: QueueModule,
        global: true,
        imports: [],
        providers: [
          // Stub health indicator that always reports "disabled"
          {
            provide: QueueHealthIndicator,
            useValue: {
              check: async () => ({ queue: { status: 'disabled' } }),
            } as unknown as QueueHealthIndicator,
          },
        ],
        exports: [QueueHealthIndicator],
      };
    }

    return {
      module: QueueModule,
      global: true,
      imports: [
        // Shared Redis connection — all queues use this pool.
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService<EnvConfig, true>) => {
            const redisUrl = config.get('REDIS_URL', { infer: true });
            logger.log(`Connecting to Redis: ${redisUrl.replace(/:\/\/.*@/, '://***@')}`);
            return {
              connection: {
                // ioredis connection options
                // Parse from URL — ioredis accepts full redis:// URLs.
                // lazyConnect: false — fail fast at startup if Redis is down.
                maxRetriesPerRequest: 3,
              },
              // BullMQ uses this URL format directly
              url: redisUrl,
            };
          },
        }),

        // Register all queues.
        // Jobs are added via @InjectQueue(); Workers are in their own modules.
        BullModule.registerQueue(
          { name: QUEUE_NAMES.RESUME_PARSE },
          { name: QUEUE_NAMES.NOTIFICATION_EMAIL },
          { name: QUEUE_NAMES.NOTIFICATION_PUSH },
          { name: QUEUE_NAMES.REPORT_GENERATE },
          { name: QUEUE_NAMES.CLEANUP_SCHEDULED },
        ),
      ],
      providers: [QueueHealthIndicator],
      exports: [
        BullModule,         // re-exports Queue tokens for @InjectQueue()
        QueueHealthIndicator,
      ],
    };
  }
}
