import { Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { BaseWorker } from '../../../queue/base.worker';
import { QUEUE_NAMES } from '../../../queue/queue.constants';
import { ResumeIngestionOrchestrator } from '../pipeline/resume-ingestion.orchestrator';
import type { ResumeParseJobData } from '../parsing-jobs.service';

const RESUME_PARSE_CONCURRENCY = Number(process.env['RESUME_PARSE_WORKER_CONCURRENCY'] ?? '4');

/**
 * ResumeParseWorker — consumes the `resume-parse` queue.
 *
 * The job carries only `{ parsingJobId, organizationId }`. The orchestrator
 * loads the rest from the database, so retried jobs don't suffer from stale
 * payloads.
 *
 * Throwing here re-routes through BullMQ's AI_JOB_OPTIONS retry/backoff. The
 * orchestrator itself catches errors and marks the ParsingJob FAILED — so by
 * the time we re-throw here, the row is already in its terminal state. We
 * keep the throw so the operator-visible BullMQ failed-jobs UI surfaces the
 * issue too.
 *
 * Worker is only registered when REDIS_ENABLED=true (see resumes.module.ts).
 */
@Processor(QUEUE_NAMES.RESUME_PARSE, { concurrency: RESUME_PARSE_CONCURRENCY })
export class ResumeParseWorker extends BaseWorker<ResumeParseJobData> {
  protected readonly logger = new Logger(ResumeParseWorker.name);

  constructor(private readonly orchestrator: ResumeIngestionOrchestrator) {
    super();
  }

  protected async execute(job: Job<ResumeParseJobData>): Promise<void> {
    await this.orchestrator.run(job.data.parsingJobId, job.data.organizationId);
  }
}
