import { Module } from '@nestjs/common';

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

const redisEnabled = process.env['REDIS_ENABLED'] === 'true';

@Module({
  imports:     [ExtractionConfigModule, DuplicatesModule, AvScanModule],
  controllers: [
    ResumesController, ResumeIntakeBatchesController,
    ParsingJobsController,
    ReviewTasksController,
  ],
  providers:   [
    // R1
    ResumesService, ResumesRepository,
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
  exports:     [ResumesService, ParsingJobsService, ReviewTasksService],
})
export class ResumesModule {}
