import { Injectable } from '@nestjs/common';
import type { ParsingJobStatus, Prisma, ResumeParserProvider } from '@repo/database';

import { PrismaService } from '../../database';

@Injectable()
export class ParsingJobsRepository {
  constructor(private readonly db: PrismaService) {}

  // ── Creates ───────────────────────────────────────────────────────────────

  /**
   * Create a new ParsingJob row for the next attempt against this version.
   * versionNumber + attempt uniqueness is enforced at the DB level, so two
   * concurrent enqueues for the same version naturally race-resolve to one.
   */
  async createNextAttempt(input: {
    resumeVersionId: string;
    organizationId:  string;
    provider:        ResumeParserProvider;
    providerVersion?: string;
  }) {
    const last = await this.db.parsingJob.findFirst({
      where:   { resumeVersionId: input.resumeVersionId },
      orderBy: { attempt: 'desc' },
      select:  { attempt: true },
    });
    const nextAttempt = (last?.attempt ?? 0) + 1;
    return this.db.parsingJob.create({
      data: {
        resumeVersionId: input.resumeVersionId,
        organizationId:  input.organizationId,
        provider:        input.provider,
        providerVersion: input.providerVersion ?? null,
        status:          'QUEUED',
        attempt:         nextAttempt,
      },
    });
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  async findById(id: string, organizationId: string) {
    return this.db.parsingJob.findFirst({
      where:   { id, organizationId },
      include: { extractionResult: true },
    });
  }

  async findHistory(resumeVersionId: string, organizationId: string) {
    return this.db.parsingJob.findMany({
      where:   { resumeVersionId, organizationId },
      orderBy: { attempt: 'desc' },
      include: { extractionResult: { select: { id: true, overallConfidence: true } } },
    });
  }

  // ── Status transitions ────────────────────────────────────────────────────

  async markRunning(id: string) {
    await this.db.parsingJob.update({
      where: { id },
      data:  { status: 'RUNNING', startedAt: new Date() },
    });
  }

  async markCancelled(id: string, organizationId: string): Promise<boolean> {
    const updated = await this.db.parsingJob.updateMany({
      where: { id, organizationId, status: { in: ['QUEUED', 'RUNNING'] } },
      data:  { status: 'CANCELLED', finishedAt: new Date() },
    });
    return updated.count > 0;
  }

  async markFailed(id: string, errorCode: string, errorMessage: string, durationMs: number) {
    await this.db.parsingJob.update({
      where: { id },
      data:  {
        status:       'FAILED',
        finishedAt:   new Date(),
        durationMs,
        errorCode,
        errorMessage: errorMessage.slice(0, 4000),
      },
    });
  }

  /**
   * Atomic success: write ExtractionResult, link it from the ParsingJob,
   * flip Resume.status → NEEDS_REVIEW, all in one transaction.
   */
  async recordSuccess(input: {
    parsingJobId:    string;
    resumeVersionId: string;
    resumeId:        string;
    organizationId:  string;
    durationMs:      number;
    provider:        ResumeParserProvider;
    providerVersion: string;
    payload:         Prisma.InputJsonValue;
    confidence:      Prisma.InputJsonValue;
    overallConfidence: number;
    rawText:         string | null;
    parserMetadata:  Prisma.InputJsonValue;
    costUsd?:        number | null;
    inputTokens?:    number | null;
    outputTokens?:   number | null;
  }) {
    return this.db.$transaction(async (tx) => {
      const extraction = await tx.extractionResult.create({
        data: {
          parsingJobId:      input.parsingJobId,
          resumeVersionId:   input.resumeVersionId,
          organizationId:    input.organizationId,
          schemaVersion:     1,
          payload:           input.payload,
          confidence:        input.confidence,
          overallConfidence: input.overallConfidence,
          rawText:           input.rawText,
          parserMetadata:    input.parserMetadata,
        },
      });
      await tx.parsingJob.update({
        where: { id: input.parsingJobId },
        data: {
          status:            'SUCCEEDED',
          finishedAt:        new Date(),
          durationMs:        input.durationMs,
          provider:          input.provider,
          providerVersion:   input.providerVersion,
          extractionResultId: extraction.id,
          costUsd:           input.costUsd          ?? null,
          inputTokens:       input.inputTokens      ?? null,
          outputTokens:      input.outputTokens     ?? null,
        },
      });
      await tx.resume.update({
        where: { id: input.resumeId },
        data:  { status: 'NEEDS_REVIEW' },
      });
      return extraction;
    });
  }

  // ── Budget accounting ─────────────────────────────────────────────────────

  /**
   * Sum costUsd for SUCCEEDED jobs in the org during the current calendar
   * month. Used by the orchestrator to gate further AI-backed parses when the
   * org's monthlyParseBudgetUsd is set.
   */
  async monthlySpendUsd(organizationId: string): Promise<number> {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const agg = await this.db.parsingJob.aggregate({
      where: {
        organizationId,
        status: 'SUCCEEDED',
        finishedAt: { gte: start },
      },
      _sum: { costUsd: true },
    });
    const total = agg._sum.costUsd;
    return total === null || total === undefined ? 0 : Number(total);
  }

  async monthlySuccessCount(organizationId: string): Promise<number> {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    return this.db.parsingJob.count({
      where: { organizationId, status: 'SUCCEEDED', finishedAt: { gte: start } },
    });
  }

  // ── Supersede ─────────────────────────────────────────────────────────────

  /**
   * When a new version is uploaded for the same resume, any QUEUED/RUNNING
   * jobs against the previous version are marked SUPERSEDED.
   */
  async supersedeForVersion(resumeVersionId: string) {
    await this.db.parsingJob.updateMany({
      where: { resumeVersionId, status: { in: ['QUEUED', 'RUNNING'] } },
      data:  { status: 'SUPERSEDED', finishedAt: new Date() },
    });
  }

  async findByStatus(organizationId: string, status: ParsingJobStatus, limit = 20) {
    return this.db.parsingJob.findMany({
      where:   { organizationId, status },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
  }
}
