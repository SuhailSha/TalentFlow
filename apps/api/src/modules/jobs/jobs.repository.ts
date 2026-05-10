import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/database';

import { PrismaService } from '../../database';
import { toSkip } from '../../common/helpers/response.helper';
import { JOB_DETAIL_INCLUDE, JOB_LIST_INCLUDE } from './types/job.types';
import type { ListJobsDto } from './dto/list-jobs.dto';
import { JobSortField } from './dto/list-jobs.dto';

@Injectable()
export class JobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async findMany(organizationId: string, dto: ListJobsDto) {
    if (dto.search?.trim()) {
      return this.findManyWithFts(organizationId, dto);
    }
    return this.findManyWithPrisma(organizationId, dto);
  }

  private async findManyWithPrisma(organizationId: string, dto: ListJobsDto) {
    const where = this.buildWhereClause(organizationId, dto);
    const orderBy = this.buildOrderBy(dto);
    const skip = toSkip(dto.page, dto.limit);

    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.jobDescription.findMany({
        where,
        include: JOB_LIST_INCLUDE,
        orderBy,
        skip,
        take: dto.limit,
      }),
      this.prisma.jobDescription.count({ where }),
    ]);

    return { jobs, total };
  }

  private async findManyWithFts(organizationId: string, dto: ListJobsDto) {
    const term = dto.search!.trim();
    const skip = toSkip(dto.page, dto.limit);
    const limit = dto.limit;

    const ftsRows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM job_descriptions
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND search_vector @@ plainto_tsquery('english', ${term})
      ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${term})) DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM job_descriptions
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND search_vector @@ plainto_tsquery('english', ${term})
    `;

    if (ftsRows.length === 0) {
      return { jobs: [], total: 0 };
    }

    const ids = ftsRows.map((r) => r.id);
    const rankMap = new Map(ids.map((id, i) => [id, i]));

    const nonSearchWhere = this.buildWhereClause(organizationId, { ...dto, search: undefined });
    const jobs = await this.prisma.jobDescription.findMany({
      where: { ...nonSearchWhere, id: { in: ids } },
      include: JOB_LIST_INCLUDE,
    });

    jobs.sort((a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999));

    return { jobs, total: Number(countRows[0]?.count ?? 0) };
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findById(id: string, organizationId: string) {
    return this.prisma.jobDescription.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: JOB_DETAIL_INCLUDE,
    });
  }

  async findByIdRaw(id: string, organizationId: string) {
    return this.prisma.jobDescription.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }

  // ── Counters ──────────────────────────────────────────────────────────────

  async countForOrg(organizationId: string): Promise<number> {
    return this.prisma.jobDescription.count({ where: { organizationId, deletedAt: null } });
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  async create(data: Prisma.JobDescriptionUncheckedCreateInput) {
    return this.prisma.jobDescription.create({
      data,
      include: JOB_DETAIL_INCLUDE,
    });
  }

  async update(id: string, organizationId: string, data: Prisma.JobDescriptionUncheckedUpdateInput) {
    return this.prisma.jobDescription.update({
      where: { id, organizationId },
      data: { ...data, updatedAt: new Date() },
      include: JOB_DETAIL_INCLUDE,
    });
  }

  // ── Skills ────────────────────────────────────────────────────────────────

  async findJobSkill(jobDescriptionId: string, skillId: string) {
    return this.prisma.jobSkill.findUnique({
      where: { jobDescriptionId_skillId: { jobDescriptionId, skillId } },
    });
  }

  async assignSkill(data: Prisma.JobSkillUncheckedCreateInput) {
    return this.prisma.jobSkill.create({ data, include: { skill: true } });
  }

  async updateSkill(id: string, data: Prisma.JobSkillUpdateInput) {
    return this.prisma.jobSkill.update({ where: { id }, data, include: { skill: true } });
  }

  async removeSkill(jobDescriptionId: string, skillId: string) {
    return this.prisma.jobSkill.delete({
      where: { jobDescriptionId_skillId: { jobDescriptionId, skillId } },
    });
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  async createNote(data: Prisma.JobNoteUncheckedCreateInput) {
    return this.prisma.jobNote.create({ data });
  }

  async findNotes(jobDescriptionId: string, organizationId: string, take = 50) {
    return this.prisma.jobNote.findMany({
      where: { jobDescriptionId, organizationId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildWhereClause(
    organizationId: string,
    dto: ListJobsDto,
  ): Prisma.JobDescriptionWhereInput {
    const where: Prisma.JobDescriptionWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (dto.status?.length) {
      where.status = { in: dto.status };
    }

    if (dto.hiringPriority?.length) {
      where.hiringPriority = { in: dto.hiringPriority };
    }

    if (dto.employmentType?.length) {
      where.employmentType = { in: dto.employmentType };
    }

    if (dto.workMode?.length) {
      where.workMode = { in: dto.workMode };
    }

    if (dto.department) {
      where.department = { equals: dto.department, mode: 'insensitive' };
    }

    if (dto.country) {
      where.country = { equals: dto.country, mode: 'insensitive' };
    }

    if (dto.hiringManagerId) {
      where.hiringManagerId = dto.hiringManagerId;
    }

    if (dto.experienceMin !== undefined) {
      where.experienceMax = { gte: dto.experienceMin };
    }

    if (dto.experienceMax !== undefined) {
      where.experienceMin = { lte: dto.experienceMax };
    }

    return where;
  }

  private buildOrderBy(dto: ListJobsDto): Prisma.JobDescriptionOrderByWithRelationInput {
    const dir = dto.sortOrder ?? 'desc';

    switch (dto.sortBy) {
      case JobSortField.TITLE:
        return { title: dir };
      case JobSortField.TARGET_HIRE_DATE:
        return { targetHireDate: dir };
      case JobSortField.PRIORITY:
        return { hiringPriority: dir };
      case JobSortField.CREATED_AT:
      default:
        return { createdAt: dir };
    }
  }
}
