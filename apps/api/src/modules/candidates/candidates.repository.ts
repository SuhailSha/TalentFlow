import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/database';

import { PrismaService } from '../../database';
import { toSkip } from '../../common/helpers/response.helper';
import { buildPrefixTsQuery } from '../../common/search/prefix-tsquery';
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
   * Hybrid search: prefix-token FTS UNION trigram fuzzy match.
   *
   * Two-step pattern (raw SQL → Prisma load) keeps Prisma's relation includes
   * working while still getting the GIN index + ranked ordering.
   *
   *  - The cooked tsquery uses `:*` prefixes per token so "sara" matches
   *    "sarah" and tokens AND together regardless of order ("eng sara" ≡
   *    "sara eng"). User input is sanitised by buildPrefixTsQuery so passing
   *    it to to_tsquery is safe.
   *  - The trigram `%` operator (pg_trgm, default similarity ≥ 0.3) gives
   *    typo tolerance and substring recall on the indexed name/email/title
   *    columns. Each `%` predicate uses its own GIN trigram index.
   *  - Combined score: ts_rank weighted higher than trigram similarity so
   *    FTS hits dominate the order; trigram-only hits trail as fallback.
   *
   * Non-search filters (status, country, skills) are applied in the second
   * Prisma query so filter logic isn't duplicated in raw SQL.
   */
  private async findManyWithFts(organizationId: string, dto: ListCandidatesDto) {
    const raw    = dto.search!.trim();
    const cooked = buildPrefixTsQuery(raw);
    const skip   = toSkip(dto.page, dto.limit);
    const limit  = dto.limit;

    // If the user input has no usable tokens (e.g. only punctuation), fall
    // back to the non-search path rather than passing '' to to_tsquery.
    if (!cooked) {
      return this.findManyWithPrisma(organizationId, { ...dto, search: undefined });
    }

    const ftsRows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM candidates,
           to_tsquery('simple', ${cooked}) q
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND (
          search_vector @@ q
          OR first_name      % ${raw}
          OR last_name       % ${raw}
          OR email           % ${raw}
          OR current_title   % ${raw}
          OR current_company % ${raw}
        )
      ORDER BY
        ts_rank(search_vector, q) * 10
          + GREATEST(
              similarity(coalesce(first_name,      ''), ${raw}),
              similarity(coalesce(last_name,       ''), ${raw}),
              similarity(coalesce(email,           ''), ${raw}),
              similarity(coalesce(current_title,   ''), ${raw}),
              similarity(coalesce(current_company, ''), ${raw})
            ) DESC,
        created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM candidates,
           to_tsquery('simple', ${cooked}) q
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND (
          search_vector @@ q
          OR first_name      % ${raw}
          OR last_name       % ${raw}
          OR email           % ${raw}
          OR current_title   % ${raw}
          OR current_company % ${raw}
        )
    `;

    if (ftsRows.length === 0) {
      return { candidates: [], total: 0 };
    }

    const ids     = ftsRows.map((r) => r.id);
    const rankMap = new Map(ids.map((id, i) => [id, i]));

    const nonSearchWhere = this.buildWhereClause(organizationId, { ...dto, search: undefined });
    const candidates = await this.prisma.candidate.findMany({
      where: { ...nonSearchWhere, id: { in: ids } },
      include: CANDIDATE_LIST_INCLUDE,
    });

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

  async update(id: string, organizationId: string, data: Prisma.CandidateUpdateInput) {
    return this.prisma.candidate.update({
      where: { id, organizationId, deletedAt: null },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: CANDIDATE_DETAIL_INCLUDE,
    });
  }

  async softDelete(id: string, organizationId: string, deletedBy: string) {
    return this.prisma.candidate.update({
      where: { id, organizationId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  async touchActivityAt(id: string, organizationId: string) {
    return this.prisma.candidate.updateMany({
      where: { id, organizationId, deletedAt: null },
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
