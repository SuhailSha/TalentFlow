import { Injectable } from '@nestjs/common';
import type {
  DuplicateCandidateMatch, DuplicateConfidenceTier, DuplicateDetectionRun,
  DuplicateMatchStatus, DuplicateRunTrigger, Prisma,
} from '@repo/database';

import { PrismaService } from '../../database';
import { toSkip } from '../../common/helpers/response.helper';
import type { MatchReason } from './types/match.types';

export interface PendingMatchSummary {
  total:    number;
  exact:    number;
  probable: number;
  possible: number;
}

export interface ListMatchesFilters {
  status?:           DuplicateMatchStatus | DuplicateMatchStatus[];
  tier?:             DuplicateConfidenceTier;
  sourceCandidateId?: string;
  page:              number;
  limit:             number;
}

@Injectable()
export class DuplicatesRepository {
  constructor(private readonly db: PrismaService) {}

  // ── Runs ──────────────────────────────────────────────────────────────────

  async createRun(input: {
    organizationId:    string;
    sourceCandidateId: string;
    triggeredBy:       DuplicateRunTrigger;
    triggeredById:     string;
    reviewTaskId?:     string | null;
  }): Promise<DuplicateDetectionRun> {
    return this.db.duplicateDetectionRun.create({
      data: {
        organizationId:    input.organizationId,
        sourceCandidateId: input.sourceCandidateId,
        triggeredBy:       input.triggeredBy,
        triggeredById:     input.triggeredById,
        reviewTaskId:      input.reviewTaskId ?? null,
        status:            'RUNNING',
      },
    });
  }

  async completeRun(
    id: string,
    counts: { total: number; exact: number; probable: number; possible: number },
    durationMs: number,
  ): Promise<DuplicateDetectionRun> {
    return this.db.duplicateDetectionRun.update({
      where: { id },
      data: {
        status:           'COMPLETED',
        totalMatches:     counts.total,
        exactMatches:     counts.exact,
        probableMatches:  counts.probable,
        possibleMatches:  counts.possible,
        durationMs,
        completedAt:      new Date(),
      },
    });
  }

  async failRun(id: string, message: string, durationMs: number): Promise<void> {
    await this.db.duplicateDetectionRun.update({
      where: { id },
      data:  {
        status:       'FAILED',
        errorMessage: message.slice(0, 4000),
        durationMs,
        completedAt:  new Date(),
      },
    });
  }

  async findRunById(id: string, organizationId: string) {
    return this.db.duplicateDetectionRun.findFirst({
      where:   { id, organizationId },
    });
  }

  async findRunsBySource(organizationId: string, sourceCandidateId: string, limit = 10) {
    return this.db.duplicateDetectionRun.findMany({
      where:   { organizationId, sourceCandidateId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
  }

  // ── Matches ───────────────────────────────────────────────────────────────

  async createMatches(matches: Array<{
    runId:             string;
    organizationId:    string;
    sourceCandidateId: string;
    targetCandidateId: string;
    confidenceTier:    DuplicateConfidenceTier;
    confidenceScore:   number;
    matchReasons:      MatchReason[];
  }>): Promise<void> {
    if (matches.length === 0) return;
    await this.db.duplicateCandidateMatch.createMany({
      data: matches.map((m) => ({
        ...m,
        matchReasons: m.matchReasons as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
  }

  async findMatchById(id: string, organizationId: string) {
    return this.db.duplicateCandidateMatch.findFirst({
      where: { id, organizationId },
    });
  }

  async findMatchesByRun(runId: string, organizationId: string): Promise<DuplicateCandidateMatch[]> {
    return this.db.duplicateCandidateMatch.findMany({
      where: { runId, organizationId },
      orderBy: [
        { confidenceTier: 'asc' },   // EXACT first (enum order)
        { confidenceScore: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async listMatches(organizationId: string, filters: ListMatchesFilters) {
    const where: Prisma.DuplicateCandidateMatchWhereInput = { organizationId };
    if (filters.status)            where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
    if (filters.tier)              where.confidenceTier   = filters.tier;
    if (filters.sourceCandidateId) where.sourceCandidateId = filters.sourceCandidateId;

    const skip = toSkip(filters.page, filters.limit);
    const [rows, total] = await this.db.$transaction([
      this.db.duplicateCandidateMatch.findMany({
        where,
        orderBy: [
          { status: 'asc' },             // PENDING first (enum)
          { confidenceTier: 'asc' },     // EXACT first
          { confidenceScore: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: filters.limit,
      }),
      this.db.duplicateCandidateMatch.count({ where }),
    ]);
    return { rows, total };
  }

  /**
   * Single round-trip to summarise pending+deferred matches against a source.
   * Used by ReviewTasksService.approve to decide whether to block promotion.
   */
  async pendingMatchSummary(organizationId: string, sourceCandidateId: string): Promise<PendingMatchSummary> {
    const grouped = await this.db.duplicateCandidateMatch.groupBy({
      by: ['confidenceTier'],
      where: {
        organizationId,
        sourceCandidateId,
        status: { in: ['PENDING', 'DEFERRED'] },
      },
      _count: { _all: true },
    });
    let exact = 0, probable = 0, possible = 0;
    for (const g of grouped) {
      if (g.confidenceTier === 'EXACT')    exact    = g._count._all;
      if (g.confidenceTier === 'PROBABLE') probable = g._count._all;
      if (g.confidenceTier === 'POSSIBLE') possible = g._count._all;
    }
    return { total: exact + probable + possible, exact, probable, possible };
  }

  /**
   * Mark all prior PENDING / DEFERRED matches against a given source as
   * SUPERSEDED. Called at the start of a new run so the new matches don't
   * race-condition with stale ones.
   */
  async supersedePriorPendingForSource(organizationId: string, sourceCandidateId: string): Promise<void> {
    await this.db.duplicateCandidateMatch.updateMany({
      where: {
        organizationId,
        sourceCandidateId,
        status: { in: ['PENDING', 'DEFERRED'] },
      },
      data: { status: 'SUPERSEDED' },
    });
  }

  /**
   * After a new run creates matches, propagate prior NOT_DUPLICATE decisions
   * onto pairs the recruiter has already resolved. A recruiter who says
   * "Bob in this org is not a duplicate of Bob Senior" once shouldn't be
   * forced to repeat that decision on every re-scan.
   *
   * Returns the number of matches auto-resolved.
   */
  async propagatePriorNotDuplicateDecisions(runId: string, organizationId: string): Promise<number> {
    return this.db.$executeRaw`
      UPDATE duplicate_candidate_matches AS new_m
      SET status = 'NOT_DUPLICATE',
          decided_by_id = prev.decided_by_id,
          decided_at = NOW(),
          decision_notes = COALESCE(prev.decision_notes, '') || ' (carried forward from earlier review)'
      FROM duplicate_candidate_matches AS prev
      WHERE new_m.run_id = ${runId}::uuid
        AND new_m.organization_id = ${organizationId}::uuid
        AND new_m.status = 'PENDING'
        AND prev.organization_id = new_m.organization_id
        AND prev.source_candidate_id = new_m.source_candidate_id
        AND prev.target_candidate_id = new_m.target_candidate_id
        AND prev.status = 'NOT_DUPLICATE'
        AND prev.id != new_m.id
    `;
  }

  async setStatus(
    id: string, organizationId: string,
    status: DuplicateMatchStatus,
    decidedById: string, decisionNotes?: string | null,
  ): Promise<DuplicateCandidateMatch | null> {
    const updated = await this.db.duplicateCandidateMatch.updateMany({
      where:  { id, organizationId, status: { in: ['PENDING', 'DEFERRED'] } },
      data:   { status, decidedById, decidedAt: new Date(), decisionNotes: decisionNotes ?? null },
    });
    if (updated.count === 0) return null;
    return this.db.duplicateCandidateMatch.findFirst({ where: { id, organizationId } });
  }

  // ── Stats for sidebar badge / queue summary ───────────────────────────────

  async pendingCountForOrg(organizationId: string): Promise<{ pending: number; exact: number }> {
    const [pending, exact] = await Promise.all([
      this.db.duplicateCandidateMatch.count({ where: { organizationId, status: { in: ['PENDING', 'DEFERRED'] } } }),
      this.db.duplicateCandidateMatch.count({ where: { organizationId, status: { in: ['PENDING', 'DEFERRED'] }, confidenceTier: 'EXACT' } }),
    ]);
    return { pending, exact };
  }

  // ── Candidate lookups used by the detector + summary builder ──────────────

  async findCandidateNamesByIds(ids: string[], organizationId: string) {
    if (ids.length === 0) return [];
    return this.db.candidate.findMany({
      where: { id: { in: ids }, organizationId },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  async loadCandidateForDetection(candidateId: string, organizationId: string) {
    return this.db.candidate.findFirst({
      where: { id: candidateId, organizationId, deletedAt: null },
      include: {
        candidateSkills: { select: { skillId: true, skill: { select: { name: true, displayName: true } } } },
      },
    });
  }

  async buildCandidateSummary(candidateId: string, organizationId: string) {
    const c = await this.db.candidate.findFirst({
      where: { id: candidateId, organizationId },
      include: {
        candidateSkills: { include: { skill: { select: { id: true, name: true, displayName: true } } } },
      },
    });
    if (!c) return null;
    const [resumeCount, submissionCount, interviewCount] = await Promise.all([
      this.db.resume.count({ where: { candidateId: c.id, organizationId, deletedAt: null } }),
      this.db.submission.count({ where: { candidateId: c.id, organizationId, deletedAt: null } }),
      this.db.interview.count({ where: { candidateId: c.id, organizationId, deletedAt: null } }),
    ]);
    return {
      id:              c.id,
      firstName:       c.firstName,
      lastName:        c.lastName,
      fullName:        `${c.firstName} ${c.lastName}`,
      email:           c.email,
      phone:           c.phone,
      linkedinUrl:     c.linkedinUrl,
      currentTitle:    c.currentTitle,
      currentCompany:  c.currentCompany,
      city:            c.city,
      country:         c.country,
      status:          c.status,
      resumeCount,
      submissionCount,
      interviewCount,
      skillNames:      c.candidateSkills.map((s) => s.skill.displayName ?? s.skill.name),
      createdAt:       c.createdAt.toISOString(),
    };
  }
}
