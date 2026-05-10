import { Logger } from '@nestjs/common';
import { WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

/**
 * BaseWorker — abstract base class for all BullMQ job processors.
 *
 * Provides:
 *   1. Structured logging with job context (queue, jobId, jobName, attempt).
 *   2. Pre/post hooks for metrics and tracing (override `beforeProcess` /
 *      `afterProcess` in subclasses).
 *   3. Consistent error serialisation — raw Error objects are converted to
 *      plain JSON before BullMQ stores them in the failed set.
 *   4. A `process()` template method that subclasses must implement.
 *
 * Usage:
 *   @Processor(QUEUE_NAMES.RESUME_PARSE)
 *   export class ResumeParseWorker extends BaseWorker<ResumeParseJobData> {
 *     protected async execute(job: Job<ResumeParseJobData>): Promise<void> {
 *       // actual processing logic here
 *     }
 *   }
 *
 * Scalability notes:
 *   - Workers are singleton NestJS providers; NestJS runs them in the same
 *     Node.js process as the API. For high-throughput queues, extract workers
 *     into a separate microservice process.
 *   - BullMQ supports concurrency per worker: use the @Processor decorator's
 *     `concurrency` option (default: 1). CPU-bound jobs should stay at 1;
 *     I/O-bound jobs (HTTP calls, DB writes) can safely use 4–10.
 *
 * Testing strategy:
 *   - Unit-test `execute()` directly — do NOT use BullMQ's sandbox.
 *   - Integration-test via `queue.add()` → worker.process() with a real Redis.
 *   - Never mock the Queue class in tests that verify job processing logic.
 */
export abstract class BaseWorker<TData = unknown, TResult = void> extends WorkerHost {
  protected abstract readonly logger: Logger;

  /**
   * BullMQ calls `process()` for every dequeued job.
   * BaseWorker wraps it with logging and error handling.
   */
  override async process(job: Job<TData>): Promise<TResult> {
    const ctx = {
      queue:   job.queueName,
      jobId:   job.id,
      jobName: job.name,
      attempt: job.attemptsMade + 1,
    };

    this.logger.debug({ ...ctx }, 'Job started');

    await this.beforeProcess(job);

    const startMs = Date.now();
    try {
      const result = await this.execute(job);
      const ms = Date.now() - startMs;

      this.logger.log({ ...ctx, ms }, 'Job completed');
      await this.afterProcess(job, null);
      return result;
    } catch (err: unknown) {
      const ms    = Date.now() - startMs;
      const error = this.serialiseError(err);

      this.logger.error({ ...ctx, ms, error }, 'Job failed');
      await this.afterProcess(job, err);

      // Re-throw so BullMQ records the failure and schedules a retry.
      throw err;
    }
  }

  /**
   * Implement the actual job processing logic here.
   * Throw any Error to signal failure (BullMQ will retry per job options).
   */
  protected abstract execute(job: Job<TData>): Promise<TResult>;

  /**
   * Optional pre-processing hook.
   * Override for metrics, distributed tracing span start, etc.
   */
  protected async beforeProcess(_job: Job<TData>): Promise<void> { /* no-op */ }

  /**
   * Optional post-processing hook.
   * Override for metrics, tracing span end, custom alerting.
   * `error` is null on success.
   */
  protected async afterProcess(_job: Job<TData>, _error: unknown): Promise<void> { /* no-op */ }

  private serialiseError(err: unknown): Record<string, unknown> {
    if (err instanceof Error) {
      return { message: err.message, name: err.name, stack: err.stack };
    }
    return { raw: String(err) };
  }
}
