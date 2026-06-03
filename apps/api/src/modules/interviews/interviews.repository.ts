import { Injectable } from '@nestjs/common';
import { InterviewStatus, Prisma } from '@repo/database';

import { PrismaService } from '../../database';
import { toSkip } from '../../common/helpers/response.helper';
import { InterviewSortField, ListInterviewsDto } from './dto/list-interviews.dto';
import {
  INTERVIEW_DETAIL_INCLUDE,
  INTERVIEW_LIST_INCLUDE,
} from './types/interview.types';

@Injectable()
export class InterviewsRepository {
  constructor(private readonly db: PrismaService) {}

  // ── Queries ───────────────────────────────────────────────────────────────

  async findMany(organizationId: string, dto: ListInterviewsDto) {
    const where = this.buildWhere(organizationId, dto);
    const orderBy = this.buildOrderBy(dto);
    const skip = toSkip(dto.page, dto.limit);

    const [data, total] = await this.db.$transaction([
      this.db.interview.findMany({
        where,
        include: INTERVIEW_LIST_INCLUDE,
        orderBy,
        skip,
        take: dto.limit,
      }),
      this.db.interview.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, organizationId: string) {
    return this.db.interview.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: INTERVIEW_DETAIL_INCLUDE,
    });
  }

  async findBySubmission(submissionId: string, organizationId: string) {
    return this.db.interview.findMany({
      where: { submissionId, organizationId, deletedAt: null },
      include: INTERVIEW_LIST_INCLUDE,
      orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async stats(organizationId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, upcoming, feedbackPending, noShows, completedToday] =
      await this.db.$transaction([
        this.db.interview.count({
          where: { organizationId, deletedAt: null },
        }),
        this.db.interview.count({
          where: {
            organizationId,
            deletedAt: null,
            status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.CONFIRMED] },
            scheduledAt: { gt: now },
          },
        }),
        this.db.interview.count({
          where: { organizationId, deletedAt: null, status: InterviewStatus.FEEDBACK_PENDING },
        }),
        this.db.interview.count({
          where: { organizationId, deletedAt: null, status: InterviewStatus.NO_SHOW },
        }),
        this.db.interview.count({
          where: {
            organizationId,
            deletedAt: null,
            status: {
              in: [InterviewStatus.COMPLETED, InterviewStatus.PASSED, InterviewStatus.FAILED],
            },
            completedAt: { gte: startOfToday },
          },
        }),
      ]);

    return { total, upcoming, feedbackPending, noShows, completedToday };
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async create(data: Prisma.InterviewUncheckedCreateInput) {
    return this.db.interview.create({
      data,
      include: INTERVIEW_DETAIL_INCLUDE,
    });
  }

  // ─── Tenant-scoped writes ──────────────────────────────────────────────────
  // Application-layer defense in depth: every mutating method requires
  // organizationId in the where-clause. updateMany returns count; 0 means the
  // row doesn't exist or belongs to a different tenant. See ADR-002.

  async update(
    id: string,
    organizationId: string,
    data: Prisma.InterviewUncheckedUpdateInput,
  ) {
    const result = await this.db.interview.updateMany({
      where: { id, organizationId, deletedAt: null },
      data,
    });
    if (result.count === 0) return null;
    return this.db.interview.findUnique({
      where: { id },
      include: INTERVIEW_DETAIL_INCLUDE,
    });
  }

  async softDelete(id: string, organizationId: string) {
    const result = await this.db.interview.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count > 0;
  }

  async addNote(data: Prisma.InterviewNoteUncheckedCreateInput) {
    return this.db.interviewNote.create({ data });
  }

  async addStatusHistory(data: Prisma.InterviewStatusHistoryUncheckedCreateInput) {
    return this.db.interviewStatusHistory.create({ data });
  }

  async createFeedback(data: Prisma.InterviewFeedbackUncheckedCreateInput) {
    return this.db.interviewFeedback.create({ data });
  }

  // Feedback is interview-scoped; tenant isolation flows through the interview
  // ownership check enforced by the service before this is called. We still
  // require interviewId here so we cannot update a feedback row belonging to a
  // different interview by id alone.
  async updateFeedback(
    id: string,
    interviewId: string,
    data: Prisma.InterviewFeedbackUncheckedUpdateInput,
  ) {
    const result = await this.db.interviewFeedback.updateMany({
      where: { id, interviewId },
      data,
    });
    if (result.count === 0) return null;
    return this.db.interviewFeedback.findUnique({ where: { id } });
  }

  async findFeedbackById(id: string, interviewId: string) {
    return this.db.interviewFeedback.findFirst({ where: { id, interviewId } });
  }

  async addParticipant(data: Prisma.InterviewParticipantUncheckedCreateInput) {
    return this.db.interviewParticipant.create({ data });
  }

  async removeParticipant(id: string) {
    return this.db.interviewParticipant.delete({ where: { id } });
  }

  async findSubmissionIds(submissionId: string, organizationId: string) {
    return this.db.submission.findFirst({
      where: { id: submissionId, organizationId, deletedAt: null },
      select: { candidateId: true, jobId: true },
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildWhere(
    organizationId: string,
    dto: ListInterviewsDto,
  ): Prisma.InterviewWhereInput {
    const where: Prisma.InterviewWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (dto.status?.length)       where.status = { in: dto.status };
    if (dto.type?.length)         where.type = { in: dto.type };
    if (dto.submissionId)         where.submissionId = dto.submissionId;
    if (dto.candidateId)          where.candidateId = dto.candidateId;
    if (dto.jobId)                where.jobId = dto.jobId;
    if (dto.ownerId)              where.ownerId = dto.ownerId;

    return where;
  }

  private buildOrderBy(dto: ListInterviewsDto): Prisma.InterviewOrderByWithRelationInput {
    const dir = dto.sortOrder ?? 'desc';
    switch (dto.sortBy) {
      case InterviewSortField.UPDATED_AT:   return { updatedAt: dir };
      case InterviewSortField.SCHEDULED_AT: return { scheduledAt: dir };
      case InterviewSortField.STATUS:       return { status: dir };
      case InterviewSortField.ROUND:        return { round: dir };
      default:                              return { createdAt: dir };
    }
  }
}
