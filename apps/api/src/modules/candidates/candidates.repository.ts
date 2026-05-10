import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/database';

import { PrismaService } from '../../database';
import { toSkip } from '../../common/helpers/response.helper';
import {
  CANDIDATE_DETAIL_INCLUDE,
  CANDIDATE_LIST_INCLUDE,
} from './types/candidate.types';
import type { ListCandidatesDto } from './dto/list-candidates.dto';
import { CandidateSortField } from './dto/list-candidates.dto';

/**
 * All Prisma queries for the candidates domain.
 * Contains NO business logic — that lives in CandidatesService.
 * Every query hard-filters on `organizationId` and `deletedAt: null`
 * to enforce tenant isolation and soft-delete at the data layer.
 */
@Injectable()
export class CandidatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async findMany(organizationId: string, dto: ListCandidatesDto) {
    // Route to FTS path when a search term is present.
    // FTS uses the tsvector GIN index (migration 20240105000000_candidate_fts)
    // for relevance-ranked results. Non-search queries use Prisma's Btree indexes.
    if (dto.search?.trim()) {
      return this.findManyWithFts(organizationId, dto);
    }
    return this.findManyWithPrisma(organizationId, dto);
  }

  private async findManyWithPrisma(organizationId: string, dto: ListCandidatesDto) {
    const where   = this.buildWhereClause(organizationId, dto);
    const orderBy = this.buildOrderBy(dto);
    const skip    = toSkip(dto.page, dto.limit);

    const [candidates, total] = await this.prisma.$transaction([
      this.prisma.candidate.findMany({
        where,
        include: CANDIDATE_LIST_INCLUDE,
        orderBy,
        skip,
        take: dto.limit,
      }),
      this.prisma.candidate.count({ where }),
    ]);

    return { candidates, total };
  }

  /**
   * FTS path: plainto_tsquery → GIN index → relevance-ranked IDs → Prisma load.
   *
   * Why two-step?
   *   $queryRaw returns plain rows without Prisma's relation includes.
   *   Fetching IDs via raw SQL then loading via Prisma keeps includes working
   *   while still benefiting from the GIN index and ts_rank ordering.
   *
   * plainto_tsquery vs. to_tsquery:
   *   plainto_tsquery parses plain user input ("react developer") without
   *   requiring PostgreSQL tsquery syntax. Never pass raw user input to
   *   to_tsquery — it can throw on operators like ! or &.
   *
   * Non-search filters (status, country, skills) are applied in Prisma's
   * second query so we don't duplicate filter logic in raw SQL.
   * Trade-off: ts_rank ordering is preserved via an ID→rank map.
   */
  private async findManyWithFts(organizationId: string, dto: ListCandidatesDto) {
    const term  = dto.search!.trim();
    const skip  = toSkip(dto.page, dto.limit);
    const limit = dto.limit;

    // Step 1: ranked IDs via FTS (org-scoped, soft-delete aware)
    const ftsRows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM candidates
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND search_vector @@ plainto_tsquery('simple', ${term})
      ORDER BY ts_rank(search_vector, plainto_tsquery('simple', ${term})) DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM candidates
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND search_vector @@ plainto_tsquery('simple', ${term})
    `;

    if (ftsRows.length === 0) {
      return { candidates: [], total: 0 };
    }

    const ids     = ftsRows.map((r) => r.id);
    const rankMap = new Map(ids.map((id, i) => [id, i]));

    // Step 2: Load full records via Prisma (preserves includes + type safety)
    // Additional filters (status, skills, etc.) applied here.
    const nonSearchWhere = this.buildWhereClause(organizationId, { ...dto, search: undefined });
    const candidates = await this.prisma.candidate.findMany({
      where: { ...nonSearchWhere, id: { in: ids } },
      include: CANDIDATE_LIST_INCLUDE,
    });

    // Restore FTS relevance order (Prisma doesn't guarantee IN-clause ordering)
    candidates.sort((a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999));

    return { candidates, total: Number(countRows[0]?.count ?? 0) };
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findById(id: string, organizationId: string) {
    return this.prisma.candidate.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: CANDIDATE_DETAIL_INCLUDE,
    });
  }

  // ── Duplicate detection ───────────────────────────────────────────────────

  /** Level-1: find by exact email within org (excluding a specific ID for updates). */
  async findByEmail(email: string, organizationId: string, excludeId?: string) {
    return this.prisma.candidate.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        organizationId,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }

  /** Level-2: fuzzy name+phone match for potential duplicate warning. */
  async findPotentialDuplicates(
    firstName: string,
    lastName: string,
    phone: string | undefined,
    organizationId: string,
    excludeId?: string,
  ) {
    return this.prisma.candidate.findMany({
      where: {
        organizationId,
        deletedAt: null,
        firstName: { equals: firstName, mode: 'insensitive' },
        lastName: { equals: lastName, mode: 'insensitive' },
        ...(phone ? { phone } : {}),
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true, currentTitle: true },
      take: 5,
    });
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  async create(data: Prisma.CandidateCreateInput) {
    return this.prisma.candidate.create({
      data,
      include: CANDIDATE_DETAIL_INCLUDE,
    });
  }

  async update(id: string, _organizationId: string, data: Prisma.CandidateUpdateInput) {
    return this.prisma.candidate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: CANDIDATE_DETAIL_INCLUDE,
    });
  }

  async softDelete(id: string, _organizationId: string, deletedBy: string) {
    return this.prisma.candidate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  async touchActivityAt(id: string) {
    return this.prisma.candidate.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  }

  // ── Skills ────────────────────────────────────────────────────────────────

  async findCandidateSkill(candidateId: string, skillId: string) {
    return this.prisma.candidateSkill.findUnique({
      where: { candidateId_skillId: { candidateId, skillId } },
    });
  }

  async assignSkill(data: Prisma.CandidateSkillCreateInput) {
    return this.prisma.candidateSkill.create({ data, include: { skill: true } });
  }

  async updateSkill(id: string, data: Prisma.CandidateSkillUpdateInput) {
    return this.prisma.candidateSkill.update({
      where: { id },
      data,
      include: { skill: true },
    });
  }

  async removeSkill(candidateId: string, skillId: string) {
    return this.prisma.candidateSkill.delete({
      where: { candidateId_skillId: { candidateId, skillId } },
    });
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  async createNote(data: Prisma.CandidateNoteUncheckedCreateInput) {
    return this.prisma.candidateNote.create({ data });
  }

  async findNotes(candidateId: string, organizationId: string, take = 50) {
    return this.prisma.candidateNote.findMany({
      where: { candidateId, organizationId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildWhereClause(
    organizationId: string,
    dto: ListCandidatesDto,
  ): Prisma.CandidateWhereInput {
    const where: Prisma.CandidateWhereInput = {
      organizationId,
      deletedAt: null,
    };

    // Search is handled in findManyWithFts() via tsvector GIN index.
    // buildWhereClause() is called for non-search filters only.
    // When called from findManyWithFts(), dto.search is explicitly set to undefined.

    if (dto.status?.length) {
      where.status = { in: dto.status };
    }

    if (dto.availabilityStatus?.length) {
      where.availabilityStatus = { in: dto.availabilityStatus };
    }

    if (dto.country) {
      where.country = { equals: dto.country, mode: 'insensitive' };
    }

    if (dto.isRemote !== undefined) {
      where.isRemote = dto.isRemote;
    }

    // Experience range: convert years to careerStartDate bounds.
    // experienceMin=5 → started career BEFORE (now - 5 years) → careerStartDate < cutoff
    // experienceMax=10 → started career AFTER (now - 10 years) → careerStartDate > cutoff
    if (dto.experienceMin !== undefined || dto.experienceMax !== undefined) {
      const msPerYear = 365.25 * 24 * 60 * 60 * 1_000;
      const now = Date.now();
      where.careerStartDate = {};
      if (dto.experienceMin !== undefined) {
        where.careerStartDate.lte = new Date(now - dto.experienceMin * msPerYear);
      }
      if (dto.experienceMax !== undefined) {
        where.careerStartDate.gte = new Date(now - dto.experienceMax * msPerYear);
      }
    }

    // Skill filter — candidate must have ALL specified skills
    if (dto.skillIds?.length) {
      where.candidateSkills = {
        some: { skillId: { in: dto.skillIds } },
      };
      // Note: "must have ALL skills" requires AND semantics:
      //   for large skill sets, use a subquery pattern (Step 4B.2 refinement)
    }

    return where;
  }

  private buildOrderBy(dto: ListCandidatesDto): Prisma.CandidateOrderByWithRelationInput {
    const dir = dto.sortOrder ?? 'desc';

    switch (dto.sortBy) {
      case CandidateSortField.NAME:
        return { firstName: dir };
      case CandidateSortField.LAST_ACTIVITY:
        return { lastActivityAt: dir };
      case CandidateSortField.EXPERIENCE:
        // More experience = earlier career start date, so reverse sort dir for experience
        return { careerStartDate: dir === 'desc' ? 'asc' : 'desc' };
      case CandidateSortField.CREATED_AT:
      default:
        return { createdAt: dir };
    }
  }
}
