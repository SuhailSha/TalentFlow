import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma, ResumeParserProvider } from '@repo/database';

import type { RequestUser } from '../../auth/types/request-user.interface';
import { EventNames } from '../../common/events/event-names.constant';
import { type PrismaService } from '../../database';
import { type DuplicatesService } from '../duplicates/duplicates.service';
import { type ExtractionConfigService } from '../extraction-config/extraction-config.service';
import { type ParsingJobsService } from './parsing-jobs.service';
import { type ReviewTasksRepository } from './review-tasks.repository';
import {
  toReviewDetail,
  toReviewListItem,
  type ReviewTaskDetail,
  type ReviewTaskListItem,
} from './types/review.types';
import type { ExtractedSkill, ExtractionPayload } from './types/extraction-payload';
import type { ListReviewsDto } from './dto/list-reviews.dto';
import type {
  ApproveReviewDto,
  RejectReviewDto,
  ReviewDecisionDto,
  SaveDraftDto,
} from './dto/review-decision.dto';

/**
 * ReviewTasksService — drives the HIL review lifecycle.
 *
 * Approve path is the most consequential: the recruiter's confirmed
 * extraction is APPLIED to the upload-linked draft Candidate. Candidate
 * fields (firstName/lastName/email/phone/location/currentTitle/currentCompany)
 * are written through; skill rows are persisted in CandidateSkill keyed by
 * normalizedSkillId.
 *
 * R3 does NOT do duplicate detection — that's R4. If a recruiter wants to
 * route the extraction to a different candidate, they can pass
 * candidateAction.existingCandidateId; the linked draft candidate is then
 * archived (DRAFT → INACTIVE) and never promoted.
 *
 * R3 does NOT introduce a merge workflow — the merge UI lands in R5.
 */
@Injectable()
export class ReviewTasksService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(ReviewTasksRepository) private readonly repo: ReviewTasksRepository,
    @Inject(ParsingJobsService) private readonly parsing: ParsingJobsService,
    @Inject(ExtractionConfigService) private readonly orgConfig: ExtractionConfigService,
    @Inject(DuplicatesService) private readonly duplicates: DuplicatesService,
    @Inject(EventEmitter2) private readonly events: EventEmitter2,
  ) {}

  // ── List + detail ──────────────────────────────────────────────────────────

  async findMany(
    organizationId: string,
    dto: ListReviewsDto,
    currentUserId: string,
  ): Promise<{ tasks: ReviewTaskListItem[]; total: number }> {
    const { tasks, total } = await this.repo.findManyWithContext(
      organizationId,
      dto,
      currentUserId,
    );
    return { tasks: tasks.map(toReviewListItem), total };
  }

  async findById(id: string, organizationId: string): Promise<ReviewTaskDetail> {
    const task = await this.repo.findByIdWithContext(id, organizationId);
    if (!task) throw new NotFoundException(`Review task ${id} not found`);
    return toReviewDetail(task);
  }

  async countPending(organizationId: string): Promise<number> {
    return this.repo.countPending(organizationId);
  }

  // ── Soft lock ──────────────────────────────────────────────────────────────

  async claim(id: string, actor: RequestUser): Promise<ReviewTaskDetail> {
    const cfg = await this.orgConfig.get(actor.organizationId);
    const ok = await this.repo.claim(id, actor.organizationId, actor.userId, cfg.claimTtlMinutes);
    if (!ok) {
      const current = await this.repo.findByIdWithContext(id, actor.organizationId);
      if (!current) throw new NotFoundException(`Review task ${id} not found`);
      throw new ConflictException({
        message: `This review is claimed by another reviewer until ${current.claimExpiresAt?.toISOString() ?? '(no TTL)'}`,
        code: 'REVIEW_ALREADY_CLAIMED',
        currentAssigneeId: current.assigneeId,
      });
    }
    this.events.emit(EventNames.RESUME_REVIEW_CLAIMED, {
      reviewTaskId: id,
      organizationId: actor.organizationId,
      assigneeId: actor.userId,
    });
    return this.findById(id, actor.organizationId);
  }

  async release(id: string, actor: RequestUser): Promise<void> {
    await this.repo.release(id, actor.organizationId, actor.userId);
  }

  // ── Draft autosave ─────────────────────────────────────────────────────────

  async saveDraft(
    id: string,
    dto: SaveDraftDto,
    actor: RequestUser,
  ): Promise<{ draftVersion: number }> {
    const result = await this.repo.saveDraft({
      id,
      organizationId: actor.organizationId,
      userId: actor.userId,
      baseVersion: dto.baseVersion,
      decision: dto.decision as Prisma.InputJsonValue,
    });
    if (!result.ok) {
      if ('reason' in result && result.reason === 'STALE') {
        throw new ConflictException({
          message: 'Your draft is out of date. Reload to merge with the latest version.',
          code: 'REVIEW_DRAFT_STALE',
        });
      }
      throw new ForbiddenException({
        message: 'You must claim this review before saving a draft.',
        code: 'REVIEW_NOT_CLAIMED',
      });
    }
    return { draftVersion: result.newVersion };
  }

  // ── Approve ────────────────────────────────────────────────────────────────

  /**
   * Approve the review. Applies the recruiter's confirmed extraction to the
   * upload-linked draft Candidate (DRAFT → ACTIVE) in a single transaction.
   *
   * Returns the updated ReviewTaskDetail (with resultingCandidateId set).
   */
  async approve(id: string, dto: ApproveReviewDto, actor: RequestUser): Promise<ReviewTaskDetail> {
    const task = await this.repo.findByIdWithContext(id, actor.organizationId);
    if (!task) throw new NotFoundException(`Review task ${id} not found`);
    if (task.status !== 'PENDING' && task.status !== 'IN_REVIEW') {
      throw new ForbiddenException(`Cannot approve a review in status ${task.status}`);
    }
    const ext = task.extractionResult;
    const version = ext?.resumeVersion;
    if (!ext || !version) {
      throw new BadRequestException('Review task is missing its extraction or version');
    }

    const action = dto.decision.candidateAction ?? { kind: 'CREATE' as const };
    const targetCandidateId =
      action.kind === 'UPDATE' && action.existingCandidateId
        ? action.existingCandidateId
        : version.resume.candidateId;

    const candidate = await this.db.candidate.findFirst({
      where: { id: targetCandidateId, organizationId: actor.organizationId, deletedAt: null },
    });
    if (!candidate) {
      throw new NotFoundException(`Target candidate ${targetCandidateId} not found`);
    }

    const payload = (ext.payload as ExtractionPayload) ?? {};
    const finalPayload = this.applyDecisionToPayload(payload, dto.decision);
    const candidateUpdate = this.buildCandidateUpdate(finalPayload);

    // ── R4: duplicate-detection gate ──────────────────────────────────────
    // Detection runs against the PROPOSED scalar values (post-edit) WITHOUT
    // touching the candidate row first. Writing the new email/phone before
    // detection would trip the (organizationId, email) unique constraint
    // before we get a chance to warn the recruiter.
    if (!dto.acknowledgeDuplicates) {
      const u = candidateUpdate as Record<string, unknown>;
      const sourceOverride = {
        firstName: typeof u.firstName === 'string' ? u.firstName : null,
        lastName: typeof u.lastName === 'string' ? u.lastName : null,
        email: typeof u.email === 'string' ? u.email : null,
        phone: typeof u.phone === 'string' ? u.phone : null,
        linkedinUrl: typeof u.linkedinUrl === 'string' ? u.linkedinUrl : null,
        currentCompany: typeof u.currentCompany === 'string' ? u.currentCompany : null,
        city: typeof u.city === 'string' ? u.city : null,
      };

      const { runId, summary } = await this.duplicates.scanForReviewApprove({
        organizationId: actor.organizationId,
        sourceCandidateId: targetCandidateId,
        triggeredById: actor.userId,
        reviewTaskId: id,
        sourceOverride,
      });

      if (summary.total > 0) {
        throw new ConflictException({
          code: 'DUPLICATE_REVIEW_REQUIRED',
          message: 'Potential duplicates found. Review them before promoting this candidate.',
          runId,
          totalMatches: summary.total,
          exactMatches: summary.exact,
          probableMatches: summary.probable,
          possibleMatches: summary.possible,
        });
      }
    }

    await this.db.$transaction(async (tx) => {
      // 1. Promote the candidate
      await tx.candidate.update({
        where: { id: targetCandidateId },
        data: {
          ...candidateUpdate,
          // Only promote DRAFT → ACTIVE; leave other statuses alone.
          ...(candidate.status === 'DRAFT' ? { status: 'ACTIVE' } : {}),
          lastActivityAt: new Date(),
          updatedBy: actor.userId,
        },
      });

      // 2. Skills — write CandidateSkill rows for any normalized skill that
      //    isn't already attached. Raw-only skills (no normalizedSkillId) are
      //    skipped: they'll surface in the review history and may be added
      //    when the recruiter manually curates.
      const skills = finalPayload.professional?.skills ?? [];
      const normalised = skills.filter(
        (s): s is ExtractedSkill & { normalizedSkillId: string } => !!s.normalizedSkillId,
      );
      if (normalised.length > 0) {
        const existing = await tx.candidateSkill.findMany({
          where: {
            candidateId: targetCandidateId,
            skillId: { in: normalised.map((s) => s.normalizedSkillId) },
          },
          select: { skillId: true },
        });
        const existingIds = new Set(existing.map((e) => e.skillId));
        const toInsert = normalised.filter((s) => !existingIds.has(s.normalizedSkillId));
        if (toInsert.length > 0) {
          await tx.candidateSkill.createMany({
            data: toInsert.map((s) => ({
              candidateId: targetCandidateId,
              skillId: s.normalizedSkillId,
              proficiencyLevel: 'INTERMEDIATE' as const,
              yearsOfExperience: s.yearsOfExperience,
              isPrimary: false,
              assignedBy: actor.userId,
            })),
          });
        }
      }

      // 3. Resume → ACTIVE (status flip out of NEEDS_REVIEW)
      await tx.resume.update({
        where: { id: version.resume.id },
        data: { status: 'ACTIVE', updatedBy: actor.userId },
      });

      // 4. Mark the review APPROVED with resulting candidate
      await tx.reviewTask.updateMany({
        where: {
          id,
          organizationId: actor.organizationId,
          status: { in: ['PENDING', 'IN_REVIEW'] },
        },
        data: {
          status: 'APPROVED',
          decision: dto.decision as unknown as Prisma.InputJsonValue,
          decisionNotes: dto.decision.notes ?? null,
          decidedById: actor.userId,
          decidedAt: new Date(),
          resultingCandidateId: targetCandidateId,
          claimExpiresAt: null,
        },
      });
    });

    this.events.emit(EventNames.RESUME_REVIEW_COMPLETED, {
      reviewTaskId: id,
      organizationId: actor.organizationId,
      action: action.kind,
      candidateId: targetCandidateId,
      decidedById: actor.userId,
    });
    this.events.emit(EventNames.CANDIDATE_UPDATED, {
      candidateId: targetCandidateId,
      organizationId: actor.organizationId,
      actorId: actor.userId,
      source: 'resume-review-approved',
    });

    return this.findById(id, actor.organizationId);
  }

  // ── Reject ────────────────────────────────────────────────────────────────

  async reject(id: string, dto: RejectReviewDto, actor: RequestUser): Promise<ReviewTaskDetail> {
    const task = await this.repo.findByIdWithContext(id, actor.organizationId);
    if (!task) throw new NotFoundException(`Review task ${id} not found`);
    if (task.status !== 'PENDING' && task.status !== 'IN_REVIEW') {
      throw new ForbiddenException(`Cannot reject a review in status ${task.status}`);
    }

    await this.db.$transaction(async (tx) => {
      await tx.reviewTask.updateMany({
        where: {
          id,
          organizationId: actor.organizationId,
          status: { in: ['PENDING', 'IN_REVIEW'] },
        },
        data: {
          status: 'REJECTED',
          decision: { rejection: true, reason: dto.reason } as unknown as Prisma.InputJsonValue,
          decisionNotes: dto.reason,
          decidedById: actor.userId,
          decidedAt: new Date(),
          claimExpiresAt: null,
        },
      });

      // Archive the resume — extraction discarded; file retained for audit.
      const versionId = task.extractionResult?.resumeVersionId;
      if (versionId) {
        const version = await tx.resumeVersion.findFirst({ where: { id: versionId } });
        if (version) {
          await tx.resume.update({
            where: { id: version.resumeId },
            data: { status: 'REJECTED', updatedBy: actor.userId },
          });
        }
      }
    });

    this.events.emit(EventNames.RESUME_REVIEW_COMPLETED, {
      reviewTaskId: id,
      organizationId: actor.organizationId,
      action: 'REJECT',
      reason: dto.reason,
      decidedById: actor.userId,
    });

    return this.findById(id, actor.organizationId);
  }

  // ── Reparse ────────────────────────────────────────────────────────────────

  async requestReparse(
    id: string,
    actor: RequestUser,
    providerOverride?: ResumeParserProvider,
    notes?: string,
  ): Promise<{ reviewTaskId: string; newParsingJobId: string }> {
    const task = await this.repo.findByIdWithContext(id, actor.organizationId);
    if (!task) throw new NotFoundException(`Review task ${id} not found`);
    if (task.status !== 'PENDING' && task.status !== 'IN_REVIEW') {
      throw new ForbiddenException(`Cannot reparse a review in status ${task.status}`);
    }
    const versionId = task.extractionResult?.resumeVersionId;
    if (!versionId) {
      throw new BadRequestException('Review task has no associated resume version');
    }

    await this.repo.markReparseRequested({
      id,
      organizationId: actor.organizationId,
      userId: actor.userId,
      notes: notes ?? null,
    });

    const job = await this.parsing.reparse(versionId, actor, providerOverride);
    return { reviewTaskId: id, newParsingJobId: job.id };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Apply the recruiter's edits + rejections to the extracted payload.
   * Returns a fresh payload object — the original ExtractionResult is never
   * mutated (its row is immutable by contract).
   */
  private applyDecisionToPayload(
    payload: ExtractionPayload,
    decision: ReviewDecisionDto,
  ): ExtractionPayload {
    const next: ExtractionPayload = JSON.parse(JSON.stringify(payload));

    // Apply edited fields by dotted path.
    for (const [path, edit] of Object.entries(decision.editedFields ?? {})) {
      this.setByPath(next, path, (edit as { edited: unknown }).edited);
    }

    // Apply explicit rejections by deleting the path.
    for (const path of decision.rejectedFields ?? []) {
      this.deleteByPath(next, path);
    }

    return next;
  }

  private setByPath(obj: unknown, path: string, value: unknown): void {
    const parts = path.split('.');
    let cursor: Record<string, unknown> = obj as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i]!;
      if (typeof cursor[k] !== 'object' || cursor[k] === null) cursor[k] = {};
      cursor = cursor[k] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]!] = value;
  }

  private deleteByPath(obj: unknown, path: string): void {
    const parts = path.split('.');
    let cursor: Record<string, unknown> = obj as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i]!;
      const next = cursor[k];
      if (typeof next !== 'object' || next === null) return;
      cursor = next as Record<string, unknown>;
    }
    delete cursor[parts[parts.length - 1]!];
  }

  /**
   * Build a Prisma update payload for the Candidate row from the final
   * extraction. Only writes fields whose value is a non-empty string/number.
   */
  private buildCandidateUpdate(payload: ExtractionPayload): Prisma.CandidateUpdateInput {
    const out: Prisma.CandidateUpdateInput = {};
    const id = payload.identity;
    if (id?.firstName) out.firstName = id.firstName;
    if (id?.lastName) out.lastName = id.lastName;
    if (id?.emails?.[0]) out.email = id.emails[0]!.toLowerCase();
    if (id?.phones?.[0]) out.phone = id.phones[0];
    if (id?.linkedinUrl) out.linkedinUrl = id.linkedinUrl;
    if (id?.location?.city) out.city = id.location.city;
    if (id?.location?.state) out.stateProvince = id.location.state;
    if (id?.location?.country) out.country = id.location.country;
    const pro = payload.professional;
    if (pro?.currentTitle) out.currentTitle = pro.currentTitle;
    if (pro?.currentCompany) out.currentCompany = pro.currentCompany;
    if (pro?.summary) out.summary = pro.summary;
    return out;
  }
}
