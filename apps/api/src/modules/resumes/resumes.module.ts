import { Module } from '@nestjs/common';

import { ExtractionConfigModule } from '../extraction-config/extraction-config.module';
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
import { ResumeParseWorker } from './workers/resume-parse.worker';

const redisEnabled = process.env['REDIS_ENABLED'] === 'true';

@Module({
  imports:     [ExtractionConfigModule],
  controllers: [ResumesController, ResumeIntakeBatchesController, ParsingJobsController],
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
    // R2 — job lifecycle
    ParsingJobsService,
    ParsingJobsRepository,
    // R2 — upload-time auto-enqueue
    ResumeUploadListener,
    // R2 — BullMQ worker (only when Redis is on; sync path covered by ParsingJobsService)
    ...(redisEnabled ? [ResumeParseWorker] : []),
  ],
  exports:     [ResumesService, ParsingJobsService],
})
export class ResumesModule {}
