import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ResumeParserProvider } from '@repo/database';

import { EventNames } from '../../../common/events/event-names.constant';
import { ExtractionConfigService } from '../../extraction-config/extraction-config.service';
import { ParsingJobsRepository } from '../parsing-jobs.repository';
import { ParserRegistry } from '../parsers/parser-registry.service';
import { ParsingError } from '../parsers/parser-errors';
import { ResumesRepository } from '../resumes.repository';
import type { CustomExtractionField } from '../../extraction-config/extraction-config.service';
import type { ConfidenceMap, ExtractionPayload } from '../types/extraction-payload';
import type { ParseResult } from '../parsers/parser-provider.interface';
import { DataNormalizationService } from './data-normalization.service';
import { FileRetrievalService } from './file-retrieval.service';
import { PayloadStripperService } from './payload-stripper.service';
import { TextExtractionService } from './text-extraction.service';

/**
 * The single class that knows the full parsing sequence.
 *
 *   File Retrieval
 *     → Text Extraction
 *     → Parsing (via ParserRegistry failover chain)
 *     → Normalisation
 *     → Payload Stripping (MANDATORY — enforces OrganizationExtractionConfig)
 *     → Persistence (atomic ExtractionResult + Resume.status flip)
 *     → resume.review.required event (no ReviewTask row in R2; that's R3)
 *
 * Invocation:
 *   - From the BullMQ worker on async/Redis path
 *   - From ParsingJobsService.runSync() on sync fallback path
 *
 * Either path produces the same DB outcome; the orchestrator is the source
 * of truth for "what happens during a parse".
 *
 * The orchestrator guarantees ParsingJob ALWAYS reaches a terminal state
 * (SUCCEEDED, FAILED, CANCELLED, or SUPERSEDED) — never stuck in RUNNING.
 */
@Injectable()
export class ResumeIngestionOrchestrator {
  private readonly logger = new Logger(ResumeIngestionOrchestrator.name);

  constructor(
    private readonly jobsRepo:    ParsingJobsRepository,
    private readonly resumesRepo: ResumesRepository,
    private readonly fileStage:   FileRetrievalService,
    private readonly textStage:   TextExtractionService,
    private readonly normalize:   DataNormalizationService,
    private readonly stripper:    PayloadStripperService,
    private readonly registry:    ParserRegistry,
    private readonly orgConfig:   ExtractionConfigService,
    private readonly events:      EventEmitter2,
  ) {}

  /**
   * Run the full pipeline for one ParsingJob. Idempotent: a SUCCEEDED job is
   * not re-run; a CANCELLED job exits early. The orchestrator catches every
   * known error path and records the appropriate terminal status.
   */
  async run(parsingJobId: string, organizationId: string): Promise<void> {
    const job = await this.jobsRepo.findById(parsingJobId, organizationId);
    if (!job) {
      this.logger.warn(`ParsingJob ${parsingJobId} not found — orchestrator no-op`);
      return;
    }
    if (job.status === 'SUCCEEDED' || job.status === 'FAILED' || job.status === 'CANCELLED' || job.status === 'SUPERSEDED') {
      this.logger.debug(`ParsingJob ${parsingJobId} already terminal (${job.status}) — skipping`);
      return;
    }

    await this.jobsRepo.markRunning(job.id);
    this.events.emit(EventNames.RESUME_PARSE_REQUESTED, {
      parsingJobId: job.id,
      organizationId,
      provider: job.provider,
      attempt: job.attempt,
    });

    const startedAt = Date.now();
    try {
      // 1. Org settings (for prompt + stripper)
      const orgCfg = await this.orgConfig.get(organizationId);
      const customFieldIds = new Set((orgCfg.customFields as CustomExtractionField[]).map((f) => f.id));

      // 2. Budget check
      await this.assertWithinBudget(organizationId, orgCfg);

      // 3. File retrieval
      const file = await this.fileStage.fetch(job.resumeVersionId, organizationId, null);

      // 4. Text extraction
      const text = await this.textStage.extract(file.bytes, file.mimeType);
      if (!text.rawText.trim()) {
        throw new ParsingError('permanent', 'Text extraction returned empty content');
      }

      // 5. Parsing with failover
      const chain = this.registry.resolveChain(
        orgCfg.preferredProvider as ResumeParserProvider,
        orgCfg.fallbackProvider as ResumeParserProvider | null,
      );
      const { result, providerUsed, providerVersion, fallbackTriggered, attemptedProviders } =
        await this.parseWithFailover(chain, text.rawText, {
          organizationId,
          extractFields: orgCfg.extractFields as Record<string, Record<string, boolean>>,
          customFields:  orgCfg.customFields  as CustomExtractionField[],
          extractionRules: orgCfg.extractionRules as Record<string, unknown>,
        });

      // 6. Normalisation
      const normalised = await this.normalize.normalise(result.payload);

      // 7. Payload Stripper (MANDATORY — enforces extractFields allowlist)
      const { payload: stripped, stripped: strippedFields } = this.stripper.strip(
        normalised,
        orgCfg.extractFields as Record<string, Record<string, boolean>>,
        customFieldIds,
      );

      // 8. Compute aggregate confidence
      const overallConfidence = this.computeOverallConfidence(result.confidence, stripped);

      // 9. Resolve resumeId for the status flip
      const version = await this.resumesRepo.findVersionById(job.resumeVersionId, organizationId);
      if (!version) throw new ParsingError('permanent', `ResumeVersion ${job.resumeVersionId} disappeared mid-parse`);

      // 10. Persist (atomic)
      const durationMs = Date.now() - startedAt;
      await this.jobsRepo.recordSuccess({
        parsingJobId:    job.id,
        resumeVersionId: job.resumeVersionId,
        resumeId:        version.resumeId,
        organizationId,
        durationMs,
        provider:        providerUsed,
        providerVersion,
        payload:         stripped as unknown as never,           // JSON-safe
        confidence:      result.confidence as unknown as never,
        overallConfidence,
        rawText:         text.rawText.slice(0, 200_000),
        parserMetadata: {
          providerUsed,
          providerVersion,
          fallbackTriggered,
          attemptedProviders,
          strippedFields,
          textCharCount: text.rawText.length,
          pageCount: text.pageCount ?? null,
          notes: result.notes ?? [],
        } as unknown as never,
        costUsd:      result.costUsd      ?? null,
        inputTokens:  result.inputTokens  ?? null,
        outputTokens: result.outputTokens ?? null,
      });

      // 11. Events
      this.events.emit(EventNames.RESUME_PARSE_COMPLETED, {
        parsingJobId: job.id,
        organizationId,
        resumeVersionId: job.resumeVersionId,
        overallConfidence,
        providerUsed,
        fallbackTriggered,
      });
      this.events.emit(EventNames.RESUME_REVIEW_REQUIRED, {
        parsingJobId: job.id,
        organizationId,
        resumeId:     version.resumeId,
        resumeVersionId: job.resumeVersionId,
      });
    } catch (e: unknown) {
      const durationMs = Date.now() - startedAt;
      const code = e instanceof ParsingError ? e.code : 'unknown';
      const msg  = e instanceof Error ? e.message : String(e);
      this.logger.warn({ parsingJobId, code, msg }, 'ParsingJob failed');
      await this.jobsRepo.markFailed(job.id, code, msg, durationMs);
      this.events.emit(EventNames.RESUME_PARSE_FAILED, {
        parsingJobId: job.id,
        organizationId,
        errorCode: code,
        errorMessage: msg,
      });
    }
  }

  // ── Failover loop ─────────────────────────────────────────────────────────

  private async parseWithFailover(
    chain: ReturnType<ParserRegistry['resolveChain']>,
    rawText: string,
    opts: {
      organizationId: string;
      extractFields:  Record<string, Record<string, boolean>>;
      customFields:   CustomExtractionField[];
      extractionRules: Record<string, unknown>;
    },
  ): Promise<{
    result:             ParseResult;
    providerUsed:       ResumeParserProvider;
    providerVersion:    string;
    fallbackTriggered:  boolean;
    attemptedProviders: Array<{ provider: ResumeParserProvider; errorCode?: string; errorMessage?: string }>;
  }> {
    const attempted: Array<{ provider: ResumeParserProvider; errorCode?: string; errorMessage?: string }> = [];

    for (let i = 0; i < chain.length; i++) {
      const provider = chain[i];
      if (!provider) continue;
      try {
        const result = await provider.parse(rawText, {
          organizationId: opts.organizationId,
          extractFields:  opts.extractFields,
          customFields:   opts.customFields,
          extractionRules: opts.extractionRules,
        });
        attempted.push({ provider: provider.name });
        return {
          result,
          providerUsed:      provider.name,
          providerVersion:   provider.version,
          fallbackTriggered: i > 0,
          attemptedProviders: attempted,
        };
      } catch (e: unknown) {
        const code = e instanceof ParsingError ? e.code : 'unknown';
        const msg  = e instanceof Error ? e.message : String(e);
        attempted.push({ provider: provider.name, errorCode: code, errorMessage: msg });
        this.logger.warn(`Provider ${provider.name} failed (${code}): ${msg}`);
        // continue to next provider
      }
    }

    // All providers exhausted — last error wins
    const last = attempted[attempted.length - 1];
    throw new ParsingError(
      'permanent',
      `All providers failed. Last: ${last?.provider} (${last?.errorCode}) — ${last?.errorMessage}`,
    );
  }

  // ── Budget enforcement ────────────────────────────────────────────────────

  private async assertWithinBudget(
    organizationId: string,
    orgCfg: { monthlyParseBudgetUsd: number | null; monthlyParseBudgetCount: number | null },
  ): Promise<void> {
    if (orgCfg.monthlyParseBudgetUsd !== null && orgCfg.monthlyParseBudgetUsd !== undefined) {
      const spend = await this.jobsRepo.monthlySpendUsd(organizationId);
      if (spend >= orgCfg.monthlyParseBudgetUsd) {
        throw new ParsingError(
          'budget_exceeded',
          `Monthly parse budget reached ($${spend.toFixed(2)} / $${orgCfg.monthlyParseBudgetUsd.toFixed(2)})`,
        );
      }
    }
    if (orgCfg.monthlyParseBudgetCount !== null && orgCfg.monthlyParseBudgetCount !== undefined) {
      const count = await this.jobsRepo.monthlySuccessCount(organizationId);
      if (count >= orgCfg.monthlyParseBudgetCount) {
        throw new ParsingError(
          'budget_exceeded',
          `Monthly parse count budget reached (${count} / ${orgCfg.monthlyParseBudgetCount})`,
        );
      }
    }
  }

  // ── Confidence aggregation ────────────────────────────────────────────────

  /**
   * Weighted average over per-field confidence, restricted to fields actually
   * present in the post-strip payload. If the payload is empty, returns 0.
   */
  private computeOverallConfidence(confidence: ConfidenceMap, payload: ExtractionPayload): number {
    const presentFields = this.collectPresentFieldPaths(payload);
    if (presentFields.length === 0) return 0;
    let sum = 0;
    let n   = 0;
    for (const path of presentFields) {
      const c = this.lookupConfidence(confidence, path);
      if (c !== undefined) {
        sum += c;
        n += 1;
      }
    }
    return n === 0 ? 0 : Math.round((sum / n) * 1000) / 1000;
  }

  private collectPresentFieldPaths(payload: ExtractionPayload, prefix = ''): string[] {
    const paths: string[] = [];
    const obj = payload as unknown as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      const p = prefix ? `${prefix}.${key}` : key;
      if (v == null) continue;
      if (Array.isArray(v)) {
        if (v.length > 0) paths.push(p);
      } else if (typeof v === 'object') {
        paths.push(...this.collectPresentFieldPaths(v as ExtractionPayload, p));
      } else {
        paths.push(p);
      }
    }
    return paths;
  }

  private lookupConfidence(c: ConfidenceMap, path: string): number | undefined {
    if (c[path] !== undefined) return c[path];
    // also try matching by leading segment (e.g. confidence on "identity.emails"
    // covers individual element paths).
    for (const k of Object.keys(c)) {
      if (path.startsWith(k)) return c[k];
    }
    return undefined;
  }
}
