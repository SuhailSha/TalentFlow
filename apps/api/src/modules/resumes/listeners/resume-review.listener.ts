import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventNames } from '../../../common/events/event-names.constant';
import { PrismaService } from '../../../database';
import { ExtractionConfigService } from '../../extraction-config/extraction-config.service';
import { ReviewTasksRepository } from '../review-tasks.repository';

interface ReviewRequiredPayload {
  parsingJobId:     string;
  organizationId:   string;
  resumeId:         string;
  resumeVersionId:  string;
  /** Set when this extraction superseded an earlier review (reparse chain). */
  predecessorReviewTaskId?: string;
}

/**
 * Creates a ReviewTask the moment R2's orchestrator persists an
 * ExtractionResult. Idempotent — if a task already exists for the
 * extraction (race / replay), the listener no-ops.
 */
@Injectable()
export class ResumeReviewListener {
  private readonly logger = new Logger(ResumeReviewListener.name);

  constructor(
    private readonly repo:      ReviewTasksRepository,
    private readonly orgConfig: ExtractionConfigService,
    private readonly db:        PrismaService,
  ) {}

  @OnEvent(EventNames.RESUME_REVIEW_REQUIRED, { async: true })
  async onReviewRequired(payload: ReviewRequiredPayload): Promise<void> {
    try {
      const cfg = await this.orgConfig.get(payload.organizationId);
      const slaDueAt = cfg.reviewSlaHours > 0
        ? new Date(Date.now() + cfg.reviewSlaHours * 60 * 60 * 1000)
        : null;

      // Find the extraction id via the parsing job (the event payload already
      // carries parsingJobId, and ExtractionResult.parsingJobId is unique).
      const tx = await this.db.extractionResult.findFirst({
        where: { parsingJobId: payload.parsingJobId, organizationId: payload.organizationId },
        select: { id: true },
      });
      if (!tx) {
        this.logger.warn({ parsingJobId: payload.parsingJobId }, 'ExtractionResult not found for review-required event');
        return;
      }

      const existing = await this.repo.findByExtractionResult(tx.id, payload.organizationId);
      if (existing) {
        this.logger.debug({ extractionResultId: tx.id }, 'ReviewTask already exists — listener no-op');
        return;
      }

      await this.repo.create({
        extractionResultId:      tx.id,
        organizationId:          payload.organizationId,
        slaDueAt,
        priority:                'NORMAL',
        predecessorReviewTaskId: payload.predecessorReviewTaskId ?? null,
      });
      this.logger.debug({ extractionResultId: tx.id, parsingJobId: payload.parsingJobId }, 'ReviewTask created');
    } catch (e: unknown) {
      this.logger.warn(
        { err: (e as Error).message, parsingJobId: payload.parsingJobId },
        'Failed to create ReviewTask — operator can manually trigger reparse',
      );
    }
  }
}
