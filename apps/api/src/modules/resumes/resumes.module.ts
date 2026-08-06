import { type DynamicModule, Logger, Module } from '@nestjs/common';

import { DuplicatesModule } from '../duplicates/duplicates.module';
import { ExtractionConfigModule } from '../extraction-config/extraction-config.module';
import { AvScanModule } from './av-scan/av-scan.module';
import { ResumeIntakeBatchesController, ResumesController } from './resumes.controller';
import { ResumesRepository } from './resumes.repository';
import { ResumesService } from './resumes.service';
import { ParsingJobsController } from './parsing-jobs.controller';
import { ParsingJobsRepository } from './parsing-jobs.repository';
import { ParsingJobsService } from './parsing-jobs.service';
import { GeminiFlashParser } from './parsers/gemini-flash.parser';
import { RuleBasedParser } from './parsers/rule-based.parser';
import { ParserRegistry } from './parsers/parser-registry.service';
import { FileRetrievalService } from './pipeline/file-retrieval.service';
import { TextExtractionService } from './pipeline/text-extraction.service';
import { DataNormalizationService } from './pipeline/data-normalization.service';
import { PayloadStripperService } from './pipeline/payload-stripper.service';
import { ResumeIngestionOrchestrator } from './pipeline/resume-ingestion.orchestrator';
import { ResumeUploadListener } from './listeners/resume-upload.listener';
import { ResumeReviewListener } from './listeners/resume-review.listener';
import { ResumeParseWorker } from './workers/resume-parse.worker';
import { ReviewTasksController } from './review-tasks.controller';
import { ReviewTasksRepository } from './review-tasks.repository';
import { ReviewTasksService } from './review-tasks.service';

const logger = new Logger('ResumesModule');

/**
 * ResumesModule is a DYNAMIC module purely so the REDIS_ENABLED check happens
 * at the right time.
 *
 * Why this matters: a top-level `const redisEnabled = process.env[...]` here
 * evaluates when this FILE IS IMPORTED, and ES import bindings are resolved
 * before the importing module's body runs. That means it ran before
 * `ConfigModule.forRoot()` in app.module.ts had copied .env into process.env,
 * so REDIS_ENABLED was always `undefined` → the worker was never registered →
 * every ParsingJob sat in QUEUED forever with no consumer, while the producer
 * happily enqueued to Redis.
 *
 * Reading it inside `register()` instead defers the check to when app.module's
 * imports array is evaluated — i.e. after ConfigModule.forRoot() has run. This
 * is the same pattern QueueModule.register() already uses (and why the queue
 * connection worked while the worker silently did not).
 */
@Module({})
export class ResumesModule {
  static register(): DynamicModule {
    const redisEnabled = process.env['REDIS_ENABLED'] === 'true';

    if (!redisEnabled) {
      logger.warn(
        'REDIS_ENABLED is not true — ResumeParseWorker not registered. ' +
          'Parses will run inline via ParsingJobsService (dev-only sync fallback).',
      );
    }

    return {
      module: ResumesModule,
      imports: [ExtractionConfigModule, DuplicatesModule, AvScanModule],
      controllers: [
        ResumesController,
        ResumeIntakeBatchesController,
        ParsingJobsController,
        ReviewTasksController,
      ],
      providers: [
        // R1
        ResumesService,
        ResumesRepository,
        // R2 — pipeline
        FileRetrievalService,
        TextExtractionService,
        DataNormalizationService,
        PayloadStripperService,
        ResumeIngestionOrchestrator,
        // R2 — parsers
        GeminiFlashParser,
        RuleBasedParser,
        ParserRegistry,
        // R2 — job lifecycle + auto-enqueue listener
        ParsingJobsService,
        ParsingJobsRepository,
        ResumeUploadListener,
        // R2 — BullMQ worker (only when Redis is on; sync path covered by ParsingJobsService)
        ...(redisEnabled ? [ResumeParseWorker] : []),
        // R3 — review queue
        ReviewTasksService,
        ReviewTasksRepository,
        ResumeReviewListener,
      ],
      exports: [ResumesService, ParsingJobsService, ReviewTasksService],
    };
  }
}
