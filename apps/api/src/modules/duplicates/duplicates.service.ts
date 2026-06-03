import {
  ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { DuplicateConfidenceTier } from '@repo/database';

import type { RequestUser } from '../../auth/types/request-user.interface';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { DuplicatesRepository, type PendingMatchSummary } from './duplicates.repository';
import {
  toMatchListItem, toRunSummary,
  type CandidateSummary, type DuplicateMatchDetail, type DuplicateMatchListItem,
  type DuplicateRunDetail, type DuplicateRunSummary,
} from './types/match.types';
import type { ListMatchesDto } from './dto/duplicate-decision.dto';

/**
 * DuplicatesService — façade over detection + decisioning.
 *
 * scanForReviewApprove() is the gate called by ReviewTasksService.approve()
 * before any candidate writes. The list + detail read paths and per-match
 * decision endpoints power the duplicate review workspace.
 *
 * Merge is intentionally NOT implemented. CONFIRMED_DUPLICATE remains a
 * reserved enum value with no setter in this phase.
 */
@Injectable()
export class DuplicatesService {
  constructor(
    private readonly repo:     DuplicatesRepository,
    private readonly detector: DuplicateDetectionService,
    private readonly events:   EventEmitter2,
  ) {}

  // ── Approve-flow integration ──────────────────────────────────────────────

  /**
   * Run detection AND return the post-run pending-match summary. Called from
   * ReviewTasksService.approve(). The caller blocks the approve when
   * summary.total > 0.
   */
  async scanForReviewApprove(input: {
    organizationId:    string;
    sourceCandidateId: string;
    triggeredById:     string;
    reviewTaskId:      string;
    sourceOverride?: {
      firstName?: string | null; lastName?: string | null;
      email?:     string | null; phone?:    string | null;
      linkedinUrl?: string | null; currentCompany?: string | null; city?: string | null;
    };
  }): Promise<{ runId: string; summary: PendingMatchSummary }> {
    const { run } = await this.detector.scan({
      organizationId:    input.organizationId,
      sourceCandidateId: input.sourceCandidateId,
      triggeredBy:       'REVIEW_APPROVE',
      triggeredById:     input.triggeredById,
      reviewTaskId:      input.reviewTaskId,
      sourceOverride:    input.sourceOverride,
    });
    const summary = await this.repo.pendingMatchSummary(input.organizationId, input.sourceCandidateId);
    return { runId: run.id, summary };
  }

  /**
   * Pending-summary lookup without running a fresh scan — used when the
   * recruiter retries approve after dismissing matches.
   */
  pendingSummary(organizationId: string, sourceCandidateId: string): Promise<PendingMatchSummary> {
    return this.repo.pendingMatchSummary(organizationId, sourceCandidateId);
  }

  // ── Manual scan ──────────────────────────────────────────────────────────

  async manualScan(sourceCandidateId: string, actor: RequestUser): Promise<DuplicateRunSummary> {
    const { run } = await this.detector.scan({
      organizationId:    actor.organizationId,
      sourceCandidateId,
      triggeredBy:       'MANUAL_SCAN',
      triggeredById:     actor.userId,
    });
    return toRunSummary(run);
  }

  // ── Runs ─────────────────────────────────────────────────────────────────

  async getRun(id: string, organizationId: string): Promise<DuplicateRunDetail> {
    const run = await this.repo.findRunById(id, organizationId);
    if (!run) throw new NotFoundException(`Duplicate run ${id} not found`);
    const matches = await this.repo.findMatchesByRun(id, organizationId);
    const items = await Promise.all(matches.map(async (m) => {
      const [src, tgt] = await Promise.all([
        this.repo.buildCandidateSummary(m.sourceCandidateId, organizationId),
        this.repo.buildCandidateSummary(m.targetCandidateId, organizationId),
      ]);
      return toMatchListItem(m, src?.fullName ?? '?', tgt?.fullName ?? '?');
    }));
    return { ...toRunSummary(run), matches: items };
  }

  async runsForCandidate(candidateId: string, organizationId: string): Promise<DuplicateRunSummary[]> {
    const runs = await this.repo.findRunsBySource(organizationId, candidateId, 20);
    return runs.map(toRunSummary);
  }

  // ── Matches (list + detail) ──────────────────────────────────────────────

  async listMatches(organizationId: string, dto: ListMatchesDto) {
    const { rows, total } = await this.repo.listMatches(organizationId, {
      status:            dto.status,
      tier:              dto.tier,
      sourceCandidateId: dto.sourceCandidateId,
      page:              dto.page,
      limit:             dto.limit,
    });
    // Names in one extra round trip per page.
    const candidateIds = Array.from(new Set(rows.flatMap((r) => [r.sourceCandidateId, r.targetCandidateId])));
    const names = await this.repo.findCandidateNamesByIds(candidateIds, organizationId);
    const nameById = new Map(names.map((n) => [n.id, `${n.firstName} ${n.lastName}`]));
    const items: DuplicateMatchListItem[] = rows.map((r) =>
      toMatchListItem(r, nameById.get(r.sourceCandidateId) ?? '?', nameById.get(r.targetCandidateId) ?? '?'),
    );
    return { rows: items, total };
  }

  async getMatchDetail(id: string, organizationId: string): Promise<DuplicateMatchDetail> {
    const match = await this.repo.findMatchById(id, organizationId);
    if (!match) throw new NotFoundException(`Duplicate match ${id} not found`);
    const [src, tgt, run] = await Promise.all([
      this.repo.buildCandidateSummary(match.sourceCandidateId, organizationId),
      this.repo.buildCandidateSummary(match.targetCandidateId, organizationId),
      this.repo.findRunById(match.runId, organizationId),
    ]);
    const base = toMatchListItem(
      match,
      src?.fullName ?? '?', tgt?.fullName ?? '?',
    );
    return {
      ...base,
      decisionNotes: match.decisionNotes,
      source:        (src ?? this.unknownSummary(match.sourceCandidateId)),
      target:        (tgt ?? this.unknownSummary(match.targetCandidateId)),
      reviewTaskId:  run?.reviewTaskId ?? null,
    };
  }

  // ── Decisions ────────────────────────────────────────────────────────────

  async markNotDuplicate(id: string, reason: string, actor: RequestUser): Promise<DuplicateMatchDetail> {
    const updated = await this.repo.setStatus(id, actor.organizationId, 'NOT_DUPLICATE', actor.userId, reason);
    if (!updated) throw new ForbiddenException('Match is not in a state that allows this decision.');
    this.events.emit('duplicate.match_resolved', {
      matchId: id, organizationId: actor.organizationId, decision: 'NOT_DUPLICATE', actorId: actor.userId,
    });
    return this.getMatchDetail(id, actor.organizationId);
  }

  async defer(id: string, notes: string | undefined, actor: RequestUser): Promise<DuplicateMatchDetail> {
    const updated = await this.repo.setStatus(id, actor.organizationId, 'DEFERRED', actor.userId, notes);
    if (!updated) throw new ForbiddenException('Match is not in a state that allows this decision.');
    return this.getMatchDetail(id, actor.organizationId);
  }

  // ── Stats (sidebar badge) ────────────────────────────────────────────────

  async stats(organizationId: string) {
    return this.repo.pendingCountForOrg(organizationId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private unknownSummary(id: string): CandidateSummary {
    return {
      id, firstName: '?', lastName: '?', fullName: '?',
      email: '', phone: null, linkedinUrl: null,
      currentTitle: null, currentCompany: null, city: null, country: null,
      status: 'UNKNOWN',
      resumeCount: 0, submissionCount: 0, interviewCount: 0,
      skillNames: [],
      createdAt: new Date(0).toISOString(),
    };
  }

  // ── Tier ordering helper (kept here for callers that need to sort) ────────
  static tierRank(t: DuplicateConfidenceTier): number {
    if (t === 'EXACT')    return 3;
    if (t === 'PROBABLE') return 2;
    return 1;
  }
}
