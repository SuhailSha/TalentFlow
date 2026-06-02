import { Injectable } from '@nestjs/common';
import type { Prisma, ReviewPriority, ReviewTaskStatus } from '@repo/database';

import { PrismaService } from '../../database';
import { toSkip } from '../../common/helpers/response.helper';
import type { ListReviewsDto } from './dto/list-reviews.dto';

/**
 * Prisma include shapes for the two read paths.
 *
 * `LIST_INCLUDE` is intentionally narrow — we don't pull rawText or full
 * payload for the list table. `DETAIL_INCLUDE` adds everything reviewers
 * need on the workspace screen, including the parsing job context.
 */
const LIST_INCLUDE = {
  extractionResult: {
    select: {
      overallConfidence: true,
      resumeVersion: {
        select: {
          id: true, fileName: true,
          resume: { select: { id: true, candidateId: true } },
        },
      },
    },
  },
} satisfies Prisma.ReviewTaskInclude;

const DETAIL_INCLUDE = {
  extractionResult: {
    include: {
      parsingJob: { select: { id: true, provider: true, attempt: true, durationMs: true } },
      resumeVersion: {
        select: {
          id: true, fileName: true,
          resume: { select: { id: true, candidateId: true } },
        },
      },
    },
  },
} satisfies Prisma.ReviewTaskInclude;

@Injectable()
export class ReviewTasksRepository {
  constructor(private readonly db: PrismaService) {}

  // ── Create (from listener) ────────────────────────────────────────────────

  async create(input: {
    extractionResultId:       string;
    organizationId:           string;
    slaDueAt?:                Date | null;
    priority?:                ReviewPriority;
    predecessorReviewTaskId?: string | null;
  }) {
    return this.db.reviewTask.create({
      data: {
        extractionResultId:       input.extractionResultId,
        organizationId:           input.organizationId,
        slaDueAt:                 input.slaDueAt ?? null,
        priority:                 input.priority ?? 'NORMAL',
        predecessorReviewTaskId:  input.predecessorReviewTaskId ?? null,
        status:                   'PENDING',
      },
    });
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  async findManyWithContext(organizationId: string, dto: ListReviewsDto, currentUserId: string) {
    const where: Prisma.ReviewTaskWhereInput = { organizationId };
    if (dto.status)   where.status   = dto.status;
    if (dto.priority) where.priority = dto.priority;
    if (dto.mineOnly === 'true') where.assigneeId = currentUserId;
    else if (dto.assigneeId)     where.assigneeId = dto.assigneeId;

    const skip = toSkip(dto.page, dto.limit);

    // Order: live work first (PENDING above IN_REVIEW), then priority,
    // then closest SLA, then most recent.
    const orderBy: Prisma.ReviewTaskOrderByWithRelationInput[] = [
      { priority: 'desc' },
      { slaDueAt: 'asc' },
      { createdAt: 'desc' },
    ];

    const [tasks, total] = await this.db.$transaction([
      this.db.reviewTask.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy,
        skip,
        take: dto.limit,
      }),
      this.db.reviewTask.count({ where }),
    ]);

    // Pull candidate names in one extra round trip for the list table.
    const candidateIds = Array.from(new Set(
      tasks.map((t) => t.extractionResult?.resumeVersion?.resume.candidateId).filter((x): x is string => !!x),
    ));
    const candidates = candidateIds.length
      ? await this.db.candidate.findMany({
          where: { id: { in: candidateIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    const enriched = tasks.map((t) => ({
      ...t,
      candidate: candidateMap.get(t.extractionResult?.resumeVersion?.resume.candidateId ?? '') ?? null,
    }));
    return { tasks: enriched, total };
  }

  async findByIdWithContext(id: string, organizationId: string) {
    const task = await this.db.reviewTask.findFirst({
      where:   { id, organizationId },
      include: DETAIL_INCLUDE,
    });
    if (!task) return null;
    const candidateId = task.extractionResult?.resumeVersion?.resume.candidateId;
    const candidate = candidateId
      ? await this.db.candidate.findFirst({
          where: { id: candidateId, organizationId },
          select: { id: true, firstName: true, lastName: true },
        })
      : null;
    return { ...task, candidate };
  }

  async findByExtractionResult(extractionResultId: string, organizationId: string) {
    return this.db.reviewTask.findFirst({
      where: { extractionResultId, organizationId },
      include: DETAIL_INCLUDE,
    });
  }

  async countPending(organizationId: string, status: ReviewTaskStatus[] = ['PENDING', 'IN_REVIEW']) {
    return this.db.reviewTask.count({
      where: { organizationId, status: { in: status } },
    });
  }

  // ── State transitions ─────────────────────────────────────────────────────

  /**
   * Claim a task — sets assigneeId + claim TTL. Fails if already claimed by
   * someone else and the existing claim hasn't expired.
   *
   * Returns null when the claim could not be acquired.
   */
  async claim(id: string, organizationId: string, userId: string, ttlMinutes: number) {
    const expires = new Date(Date.now() + ttlMinutes * 60_000);
    const updated = await this.db.reviewTask.updateMany({
      where: {
        id,
        organizationId,
        status: { in: ['PENDING', 'IN_REVIEW'] },
        OR: [
          { assigneeId: null },
          { assigneeId: userId },
          { claimExpiresAt: { lt: new Date() } },
        ],
      },
      data: {
        status:         'IN_REVIEW',
        assigneeId:     userId,
        claimedAt:      new Date(),
        claimExpiresAt: expires,
      },
    });
    return updated.count > 0;
  }

  async release(id: string, organizationId: string, userId: string) {
    await this.db.reviewTask.updateMany({
      where: { id, organizationId, assigneeId: userId, status: 'IN_REVIEW' },
      data:  { status: 'PENDING', assigneeId: null, claimedAt: null, claimExpiresAt: null },
    });
  }

  async saveDraft(input: {
    id:              string;
    organizationId:  string;
    userId:          string;
    baseVersion:     number;
    decision:        Prisma.InputJsonValue;
  }): Promise<{ ok: true; newVersion: number } | { ok: false; reason: 'STALE' | 'NOT_CLAIMED' }> {
    const updated = await this.db.reviewTask.updateMany({
      where: {
        id:             input.id,
        organizationId: input.organizationId,
        assigneeId:     input.userId,
        status:         'IN_REVIEW',
        draftVersion:   input.baseVersion,
      },
      data: {
        draftDecision: input.decision,
        draftVersion:  { increment: 1 },
      },
    });
    if (updated.count === 0) {
      const current = await this.db.reviewTask.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
        select: { draftVersion: true, assigneeId: true, status: true },
      });
      if (!current) return { ok: false, reason: 'NOT_CLAIMED' };
      if (current.assigneeId !== input.userId || current.status !== 'IN_REVIEW') {
        return { ok: false, reason: 'NOT_CLAIMED' };
      }
      return { ok: false, reason: 'STALE' };
    }
    return { ok: true, newVersion: input.baseVersion + 1 };
  }

  async markApproved(input: {
    id:              string;
    organizationId:  string;
    userId:          string;
    decision:        Prisma.InputJsonValue;
    decisionNotes?:  string | null;
    candidateId:     string;
  }) {
    await this.db.reviewTask.updateMany({
      where: { id: input.id, organizationId: input.organizationId, status: { in: ['PENDING', 'IN_REVIEW'] } },
      data: {
        status:                'APPROVED',
        decision:              input.decision,
        decisionNotes:         input.decisionNotes ?? null,
        decidedById:           input.userId,
        decidedAt:             new Date(),
        resultingCandidateId:  input.candidateId,
        claimExpiresAt:        null,
      },
    });
  }

  async markRejected(input: {
    id:              string;
    organizationId:  string;
    userId:          string;
    reason:          string;
  }) {
    await this.db.reviewTask.updateMany({
      where: { id: input.id, organizationId: input.organizationId, status: { in: ['PENDING', 'IN_REVIEW'] } },
      data: {
        status:        'REJECTED',
        decision:      { rejection: true } as Prisma.InputJsonValue,
        decisionNotes: input.reason,
        decidedById:   input.userId,
        decidedAt:     new Date(),
        claimExpiresAt: null,
      },
    });
  }

  /**
   * Mark a task as REPARSE_REQUESTED. The new ReviewTask is created by the
   * listener once the new ParsingJob succeeds.
   */
  async markReparseRequested(input: {
    id:              string;
    organizationId:  string;
    userId:          string;
    notes?:          string | null;
  }) {
    await this.db.reviewTask.updateMany({
      where: { id: input.id, organizationId: input.organizationId, status: { in: ['PENDING', 'IN_REVIEW'] } },
      data: {
        status:        'REPARSE_REQUESTED',
        decisionNotes: input.notes ?? null,
        decidedById:   input.userId,
        decidedAt:     new Date(),
        claimExpiresAt: null,
      },
    });
  }

  /**
   * Supersede any open ReviewTasks tied to a given ResumeVersion (used when
   * a brand-new version of the same resume gets uploaded mid-review).
   */
  async supersedeForResumeVersion(resumeVersionId: string, organizationId: string) {
    await this.db.reviewTask.updateMany({
      where: {
        organizationId,
        status: { in: ['PENDING', 'IN_REVIEW'] },
        extractionResult: { resumeVersionId },
      },
      data: { status: 'SUPERSEDED' },
    });
  }
}
