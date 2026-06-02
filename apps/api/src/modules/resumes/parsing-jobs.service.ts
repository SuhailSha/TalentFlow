import { ForbiddenException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { ResumeParserProvider } from '@repo/database';

import type { RequestUser } from '../../auth/types/request-user.interface';
import { ExtractionConfigService } from '../extraction-config/extraction-config.service';
import { QUEUE_NAMES, AI_JOB_OPTIONS } from '../../queue/queue.constants';
import { ParserRegistry } from './parsers/parser-registry.service';
import { ParsingJobsRepository } from './parsing-jobs.repository';
import { ResumesRepository } from './resumes.repository';
import { ResumeIngestionOrchestrator } from './pipeline/resume-ingestion.orchestrator';

export interface ResumeParseJobData {
  parsingJobId:    string;
  organizationId:  string;
}

/**
 * ParsingJobsService — the producer + lifecycle API for parse attempts.
 *
 * The hot path is `enqueueParse(versionId)`. Internally it:
 *   1. Reads the org's preferred provider
 *   2. Creates a ParsingJob(status=QUEUED) row
 *   3. If Redis is enabled → adds the job to the BullMQ queue (jobId === DB id)
 *   4. If Redis is disabled → schedules `setImmediate(() => orchestrator.run(...))`
 *      so the caller's response returns fast and the parse runs in-process
 *
 * Both paths converge on `ResumeIngestionOrchestrator.run()`. There is one
 * source of truth for pipeline behaviour.
 */
@Injectable()
export class ParsingJobsService {
  private readonly logger = new Logger(ParsingJobsService.name);

  constructor(
    private readonly jobsRepo:     ParsingJobsRepository,
    private readonly resumesRepo:  ResumesRepository,
    private readonly orgConfig:    ExtractionConfigService,
    private readonly registry:     ParserRegistry,
    private readonly orchestrator: ResumeIngestionOrchestrator,
    @Optional() @InjectQueue(QUEUE_NAMES.RESUME_PARSE)
    private readonly queue?:       Queue<ResumeParseJobData>,
  ) {}

  // ── Enqueue ────────────────────────────────────────────────────────────────

  /**
   * Create a ParsingJob for the given version + enqueue it. Returns the
   * created job row so callers can surface its id (e.g. in upload responses).
   *
   * `providerOverride` lets the reparse endpoint force a specific provider;
   * default falls back to the org's preferredProvider.
   */
  async enqueue(input: {
    resumeVersionId: string;
    organizationId:  string;
    providerOverride?: ResumeParserProvider;
  }) {
    const orgCfg = await this.orgConfig.get(input.organizationId);
    const preferred =
      input.providerOverride ?? (orgCfg.preferredProvider as ResumeParserProvider);

    // Pick the FIRST available provider in the failover chain — the chain is
    // re-resolved per attempt by the orchestrator, but for the ParsingJob row
    // we record the intended starting provider.
    const chain = this.registry.resolveChain(preferred, orgCfg.fallbackProvider as ResumeParserProvider | null);
    const startingProvider = chain[0]?.name ?? preferred;
    const startingVersion  = chain[0]?.version ?? '';

    const job = await this.jobsRepo.createNextAttempt({
      resumeVersionId: input.resumeVersionId,
      organizationId:  input.organizationId,
      provider:        startingProvider,
      providerVersion: startingVersion,
    });

    if (this.queue) {
      try {
        await this.queue.add(
          'RESUME_PARSE',
          { parsingJobId: job.id, organizationId: input.organizationId },
          { ...AI_JOB_OPTIONS, jobId: job.id },
        );
        this.logger.debug(`ParsingJob ${job.id} enqueued (provider=${startingProvider})`);
      } catch (e: unknown) {
        this.logger.warn(
          { err: (e as Error).message, parsingJobId: job.id },
          'Failed to enqueue ParsingJob (Redis unreachable). Running synchronously instead.',
        );
        this.runInline(job.id, input.organizationId);
      }
    } else {
      this.runInline(job.id, input.organizationId);
    }

    return job;
  }

  /**
   * Sync fallback path. setImmediate keeps the orchestrator off the caller's
   * critical path so HTTP responses return fast; the parse completes ~1-5s
   * later. Errors are caught + logged but never re-thrown — the parse job
   * row already exists and will land in FAILED if everything blows up.
   */
  private runInline(parsingJobId: string, organizationId: string): void {
    setImmediate(() => {
      this.orchestrator.run(parsingJobId, organizationId).catch((e: unknown) => {
        this.logger.error(
          { err: (e as Error).message, parsingJobId },
          'Inline orchestrator run errored unexpectedly',
        );
      });
    });
  }

  // ── Cancel / history / detail ──────────────────────────────────────────────

  async cancel(parsingJobId: string, organizationId: string): Promise<void> {
    const job = await this.jobsRepo.findById(parsingJobId, organizationId);
    if (!job) throw new NotFoundException(`Parsing job ${parsingJobId} not found`);
    if (job.status !== 'QUEUED' && job.status !== 'RUNNING') {
      throw new ForbiddenException(`Cannot cancel job in status ${job.status}`);
    }
    await this.jobsRepo.markCancelled(parsingJobId, organizationId);

    // Best effort: remove the queued BullMQ job too.
    if (this.queue) {
      try {
        const bullJob = await this.queue.getJob(parsingJobId);
        if (bullJob) await bullJob.remove();
      } catch (e) {
        this.logger.debug({ err: (e as Error).message, parsingJobId }, 'BullMQ remove failed (job may have started)');
      }
    }
  }

  async getHistory(resumeVersionId: string, organizationId: string) {
    return this.jobsRepo.findHistory(resumeVersionId, organizationId);
  }

  async getDetail(parsingJobId: string, organizationId: string) {
    const job = await this.jobsRepo.findById(parsingJobId, organizationId);
    if (!job) throw new NotFoundException(`Parsing job ${parsingJobId} not found`);
    return job;
  }

  // ── Reparse ────────────────────────────────────────────────────────────────

  /**
   * Operator-initiated reparse. Supersedes any in-flight jobs on this version,
   * then enqueues a new attempt.
   */
  async reparse(
    resumeVersionId: string,
    actor: RequestUser,
    providerOverride?: ResumeParserProvider,
  ) {
    const version = await this.resumesRepo.findVersionById(resumeVersionId, actor.organizationId);
    if (!version) throw new NotFoundException(`Resume version ${resumeVersionId} not found`);

    await this.jobsRepo.supersedeForVersion(resumeVersionId);

    return this.enqueue({
      resumeVersionId,
      organizationId: actor.organizationId,
      providerOverride,
    });
  }
}
