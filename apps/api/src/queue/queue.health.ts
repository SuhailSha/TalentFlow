import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { QUEUE_NAMES } from './queue.constants';

/**
 * QueueHealthIndicator — Terminus health check for Redis / BullMQ.
 *
 * Reports:
 *   - Redis connectivity (via BullMQ's internal ioredis client)
 *   - Queue counts: active, waiting, delayed, failed
 *
 * Integrated into GET /health so orchestrators (k8s liveness/readiness probes)
 * can detect Redis outages. A healthy queue is REQUIRED for readiness;
 * the API can serve reads without Redis but cannot process async jobs.
 *
 * The indicator uses the lightweight `resume-parse` queue as the canary —
 * if this queue's Redis connection is healthy, all queues share the same
 * connection and are therefore also healthy.
 */
@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(QueueHealthIndicator.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RESUME_PARSE)
    private readonly resumeParseQueue: Queue,
  ) {
    super();
  }

  async check(key = 'queue'): Promise<HealthIndicatorResult> {
    try {
      // isPaused() performs a lightweight Redis PING-equivalent check.
      const [isPaused, counts] = await Promise.all([
        this.resumeParseQueue.isPaused(),
        this.resumeParseQueue.getJobCounts('active', 'waiting', 'delayed', 'failed'),
      ]);

      return this.getStatus(key, true, {
        redis:   'up',
        paused:  isPaused,
        counts,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error({ err }, 'Queue health check failed');
      throw new HealthCheckError(
        'Queue health check failed',
        this.getStatus(key, false, { redis: 'down', error: message }),
      );
    }
  }
}
