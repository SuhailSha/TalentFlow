import { Injectable } from '@nestjs/common';
import { Prisma, SubmissionStatus } from '@repo/database';

import { PrismaService } from '../../database';
import { toSkip } from '../../common/helpers/response.helper';
import { ListSubmissionsDto, SubmissionSortField } from './dto/list-submissions.dto';
import {
  SUBMISSION_DETAIL_INCLUDE,
  SUBMISSION_LIST_INCLUDE,
} from './types/submission.types';

@Injectable()
export class SubmissionsRepository {
  constructor(private readonly db: PrismaService) {}

  // ── Queries ───────────────────────────────────────────────────────────────

  async findMany(organizationId: string, dto: ListSubmissionsDto) {
    const where = this.buildWhere(organizationId, dto);
    const orderBy = this.buildOrderBy(dto);
    const skip = toSkip(dto.page, dto.limit);

    const [data, total] = await this.db.$transaction([
      this.db.submission.findMany({
        where,
        include: SUBMISSION_LIST_INCLUDE,
        orderBy,
        skip,
        take: dto.limit,
      }),
      this.db.submission.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, organizationId: string) {
    return this.db.submission.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: SUBMISSION_DETAIL_INCLUDE,
    });
  }

  async findActiveForCandidateAndJob(
    organizationId: string,
    candidateId: string,
    jobId: string,
  ) {
    return this.db.submission.findFirst({
      where: {
        organizationId,
        candidateId,
        jobId,
        status: {
          notIn: [
            SubmissionStatus.REJECTED,
            SubmissionStatus.WITHDRAWN,
            SubmissionStatus.PLACED,
            SubmissionStatus.CLOSED,
          ],
        },
        deletedAt: null,
      },
      select: { id: true, status: true },
    });
  }

  async stats(organizationId: string) {
    const rows = await this.db.submission.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });

    return rows.map((r) => ({ status: r.status, count: r._count.id }));
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async create(data: Prisma.SubmissionUncheckedCreateInput) {
    return this.db.submission.create({
      data,
      include: SUBMISSION_DETAIL_INCLUDE,
    });
  }

  // ─── Tenant-scoped writes ──────────────────────────────────────────────────
  // Defense in depth: every mutating repo method requires organizationId in the
  // where-clause. Prisma's `update` requires a unique where, so we use
  // `updateMany` + a follow-up reload to retain the include shape. A row count
  // of 0 means either the row doesn't exist or belongs to a different tenant —
  // both surface as NotFoundException at the service layer.
  // See: docs/architecture/adr/adr-002-rls-strategy.md (application-layer guard).

  async update(
    id: string,
    organizationId: string,
    data: Prisma.SubmissionUncheckedUpdateInput,
  ) {
    const result = await this.db.submission.updateMany({
      where: { id, organizationId, deletedAt: null },
      data,
    });
    if (result.count === 0) return null;
    return this.db.submission.findUnique({
      where: { id },
      include: SUBMISSION_DETAIL_INCLUDE,
    });
  }

  async softDelete(id: string, organizationId: string) {
    const result = await this.db.submission.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count > 0;
  }

  async addNote(data: Prisma.SubmissionNoteUncheckedCreateInput) {
    return this.db.submissionNote.create({ data });
  }

  async addStatusHistory(data: Prisma.SubmissionStatusHistoryUncheckedCreateInput) {
    return this.db.submissionStatusHistory.create({ data });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildWhere(
    organizationId: string,
    dto: ListSubmissionsDto,
  ): Prisma.SubmissionWhereInput {
    const where: Prisma.SubmissionWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (dto.status?.length) where.status = { in: dto.status };
    if (dto.candidateId)    where.candidateId = dto.candidateId;
    if (dto.jobId)          where.jobId = dto.jobId;
    if (dto.vendorId)       where.vendorId = dto.vendorId;
    if (dto.ownerId)        where.ownerId = dto.ownerId;

    return where;
  }

  private buildOrderBy(dto: ListSubmissionsDto): Prisma.SubmissionOrderByWithRelationInput {
    const dir = dto.sortOrder ?? 'desc';
    switch (dto.sortBy) {
      case SubmissionSortField.UPDATED_AT:   return { updatedAt: dir };
      case SubmissionSortField.SUBMITTED_AT: return { submittedAt: dir };
      case SubmissionSortField.STATUS:       return { status: dir };
      default:                               return { createdAt: dir };
    }
  }
}
