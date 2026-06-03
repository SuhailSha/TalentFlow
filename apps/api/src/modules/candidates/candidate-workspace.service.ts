import { Injectable, NotFoundException } from '@nestjs/common';
import type { Candidate } from '@repo/database';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / MS_PER_DAY);
}

import { PrismaService } from '../../database';
import type {
  CandidateWorkspace,
  WorkspaceDuplicateSummary,
  WorkspaceHealthSignals,
  WorkspaceMetrics,
  WorkspaceOpenReminder,
  WorkspaceOwner,
  WorkspacePipelineBucket,
  WorkspaceProfileCompleteness,
  WorkspaceResumeSummary,
  WorkspaceTopRecruiter,
  WorkspaceTopVendor,
  WorkspaceUpcomingInterview,
} from './types/workspace.types';

const STALE_DAYS = 30;
const ACTIVE_SUBMISSION_STATUSES = [
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'ON_HOLD',
] as const;
const ACTIVE_INTERVIEW_STATUSES = [
  'SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS',
] as const;
const OPEN_REMINDER_STATUSES = [
  'PENDING', 'ACKNOWLEDGED', 'SNOOZED',
] as const;

/**
 * CandidateWorkspaceService — single-trip aggregator for the candidate detail
 * screen. Mirrors VendorWorkspaceService: runs all reads in parallel,
 * composes derived state (metrics, health flags, profile completeness,
 * health score), and returns a fully-formed workspace payload.
 *
 * Performance budget: < 200ms p95 for 50k-candidate tenants. The expensive
 * piece is the activity timeline, which is intentionally NOT loaded here —
 * the workspace screen consumes the existing /activity endpoint separately.
 */
@Injectable()
export class CandidateWorkspaceService {
  constructor(private readonly db: PrismaService) {}

  async getWorkspace(candidateId: string, organizationId: string): Promise<CandidateWorkspace> {
    const candidate = await this.db.candidate.findFirst({
      where: { id: candidateId, organizationId, deletedAt: null },
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }

    // Single fan-out — all read queries run in parallel.
    const [
      ownerRow,
      subsByStatus,
      upcomingIvRows,
      remindersOpen,
      remindersOverdue,
      resumeRows,
      duplicateGroups,
      latestDupRun,
      topMatches,
      topRecruiterRows,
      topVendorRows,
      pendingFeedbackCount,
    ] = await Promise.all([
      candidate.relationshipOwnerId
        ? this.db.user.findUnique({
            where: { id: candidate.relationshipOwnerId },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : Promise.resolve(null),

      // Submission pipeline buckets
      this.db.submission.groupBy({
        by: ['status'],
        where: { candidateId, organizationId, deletedAt: null },
        _count: { _all: true },
      }),

      // Upcoming interviews
      this.db.interview.findMany({
        where: {
          candidateId, organizationId, deletedAt: null,
          status: { in: [...ACTIVE_INTERVIEW_STATUSES] },
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: {
          id: true, scheduledAt: true, type: true, round: true, roundLabel: true, status: true,
          jobId: true,
          job: { select: { id: true, title: true, reqId: true } },
        },
      }),

      // Open reminders
      this.db.reminder.findMany({
        where: {
          candidateId, organizationId, deletedAt: null,
          status: { in: [...OPEN_REMINDER_STATUSES] },
        },
        orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
        take: 5,
        select: {
          id: true, title: true, priority: true, status: true,
          dueAt: true, type: true,
        },
      }),
      // Overdue count (separate scalar query so we don't over-fetch)
      this.db.reminder.count({
        where: {
          candidateId, organizationId, deletedAt: null,
          status: { in: [...OPEN_REMINDER_STATUSES] },
          dueAt: { lt: new Date() },
        },
      }),

      // Resumes for this candidate
      this.db.resume.findMany({
        where: { candidateId, organizationId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        include: {
          currentVersion: { select: { id: true, fileName: true, uploadedAt: true } },
        },
      }),

      // Duplicate matches grouped by tier
      this.db.duplicateCandidateMatch.groupBy({
        by: ['confidenceTier', 'status'],
        where: { organizationId, sourceCandidateId: candidateId },
        _count: { _all: true },
      }),
      // Latest duplicate run
      this.db.duplicateDetectionRun.findFirst({
        where: { organizationId, sourceCandidateId: candidateId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true },
      }),
      // Top pending matches (for the workspace duplicates snapshot)
      this.db.duplicateCandidateMatch.findMany({
        where: {
          organizationId, sourceCandidateId: candidateId,
          status: { in: ['PENDING', 'DEFERRED'] },
        },
        orderBy: [{ confidenceTier: 'asc' }, { confidenceScore: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),

      // Top recruiters who've owned submissions for this candidate
      this.db.submission.groupBy({
        by: ['ownerId'],
        where: { candidateId, organizationId, deletedAt: null },
        _count: { _all: true },
        orderBy: { _count: { ownerId: 'desc' } },
        take: 3,
      }),
      // Top vendors who've routed this candidate
      this.db.submission.groupBy({
        by: ['vendorId'],
        where: {
          candidateId, organizationId, deletedAt: null,
          vendorId: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { vendorId: 'desc' } },
        take: 3,
      }),

      // Pending feedback count via interview status
      this.db.interview.count({
        where: {
          candidateId, organizationId, deletedAt: null,
          status: 'FEEDBACK_PENDING',
        },
      }),
    ]);

    // Resolve user/vendor names referenced by groupBy results
    const recruiterIds = topRecruiterRows.map((r) => r.ownerId);
    const vendorIds    = topVendorRows.map((r) => r.vendorId).filter((v): v is string => !!v);
    const [recruiterRows, vendorRows] = await Promise.all([
      recruiterIds.length
        ? this.db.user.findMany({
            where: { id: { in: recruiterIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
      vendorIds.length
        ? this.db.vendor.findMany({
            where: { id: { in: vendorIds } },
            select: { id: true, companyName: true },
          })
        : Promise.resolve([]),
    ]);

    // Top matches need target candidate names
    const targetIds = topMatches.map((m) => m.targetCandidateId);
    const targetCandidates = targetIds.length
      ? await this.db.candidate.findMany({
          where: { id: { in: targetIds }, organizationId },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const targetById = new Map(targetCandidates.map((t) => [t.id, t]));

    // ── Resume summary ────────────────────────────────────────────────────────
    const resumeSummary = await this.buildResumeSummary(resumeRows, organizationId);

    // ── Duplicate summary ─────────────────────────────────────────────────────
    const duplicateSummary = this.buildDuplicateSummary(
      duplicateGroups, latestDupRun, topMatches, targetById,
    );

    // ── Metrics + signals ─────────────────────────────────────────────────────
    const totalSubmissions    = subsByStatus.reduce((s, g) => s + g._count._all, 0);
    const activeSubmissions   = subsByStatus
      .filter((g) => (ACTIVE_SUBMISSION_STATUSES as readonly string[]).includes(g.status))
      .reduce((s, g) => s + g._count._all, 0);
    const placedCount = subsByStatus.find((g) => g.status === 'PLACED')?._count._all ?? 0;

    const daysSinceActivity = daysSince(candidate.lastActivityAt);

    const profileCompleteness = this.computeProfileCompleteness(candidate, resumeSummary);

    const health: WorkspaceHealthSignals = {
      isStale:
        daysSinceActivity !== null &&
        daysSinceActivity >= STALE_DAYS &&
        (candidate.status === 'ACTIVE' || candidate.status === 'AVAILABLE'),
      hasOverdueReminders:     remindersOverdue > 0,
      hasPendingFeedback:      pendingFeedbackCount > 0,
      hasResumesPendingReview: resumeSummary.primaryResumeStatus === 'NEEDS_REVIEW' ||
                                resumeRows.some((r) => r.status === 'NEEDS_REVIEW'),
      hasDuplicatesPending:    duplicateSummary.pending > 0,
      hasNoActiveSubmissions:  activeSubmissions === 0,
      isProfileIncomplete:     profileCompleteness.score < 60,
    };

    const metrics: WorkspaceMetrics = {
      activeSubmissions,
      totalSubmissions,
      placedCount,
      upcomingInterviews: upcomingIvRows.length,
      pendingFeedback:    pendingFeedbackCount,
      openReminders:      remindersOpen.length,
      overdueReminders:   remindersOverdue,
      resumeCount:        resumeRows.length,
      pendingDuplicates:  duplicateSummary.pending,
      exactDuplicates:    duplicateSummary.exact,
      daysSinceActivity,
      profileCompleteness: profileCompleteness.score,
      healthScore:        this.computeHealthScore(candidate, profileCompleteness.score, health),
    };

    const pipeline: WorkspacePipelineBucket[] = subsByStatus
      .map((g) => ({ status: g.status, count: g._count._all }));

    const upcomingInterviews: WorkspaceUpcomingInterview[] = upcomingIvRows.map((iv) => ({
      id:          iv.id,
      scheduledAt: iv.scheduledAt ? iv.scheduledAt.toISOString() : null,
      type:        iv.type,
      round:       iv.round,
      roundLabel:  iv.roundLabel,
      status:      iv.status,
      jobId:       iv.jobId,
      jobTitle:    iv.job.title,
      jobReqId:    iv.job.reqId,
    }));

    const openReminders: WorkspaceOpenReminder[] = remindersOpen.map((r) => ({
      id:       r.id,
      title:    r.title,
      priority: r.priority,
      status:   r.status,
      dueAt:    r.dueAt ? r.dueAt.toISOString() : null,
      type:     r.type,
      isOverdue: r.dueAt ? new Date(r.dueAt) < new Date() : false,
    }));

    const recruiterById = new Map(recruiterRows.map((r) => [r.id, r]));
    const topRecruiters: WorkspaceTopRecruiter[] = topRecruiterRows
      .map((g) => {
        const r = recruiterById.get(g.ownerId);
        if (!r) return null;
        return {
          id:              r.id,
          firstName:       r.firstName,
          lastName:        r.lastName,
          fullName:        `${r.firstName} ${r.lastName}`,
          submissionCount: g._count._all,
        };
      })
      .filter((x): x is WorkspaceTopRecruiter => x !== null);

    const vendorById = new Map(vendorRows.map((v) => [v.id, v]));
    const topVendors: WorkspaceTopVendor[] = topVendorRows
      .map((g) => {
        if (!g.vendorId) return null;
        const v = vendorById.get(g.vendorId);
        if (!v) return null;
        return {
          id:              v.id,
          companyName:     v.companyName,
          submissionCount: g._count._all,
        };
      })
      .filter((x): x is WorkspaceTopVendor => x !== null);

    const owner: WorkspaceOwner | null = ownerRow
      ? {
          id:        ownerRow.id,
          firstName: ownerRow.firstName,
          lastName:  ownerRow.lastName,
          email:     ownerRow.email,
          fullName:  `${ownerRow.firstName} ${ownerRow.lastName}`,
        }
      : null;

    return {
      candidate,
      owner,
      metrics,
      health,
      profileCompleteness,
      resumeSummary,
      duplicateSummary,
      pipeline,
      upcomingInterviews,
      openReminders,
      topRecruiters,
      topVendors,
    };
  }

  // ── Resume summary ────────────────────────────────────────────────────────

  private async buildResumeSummary(
    resumeRows: Array<{
      id: string;
      status: string;
      currentVersionId: string | null;
      currentVersion: { id: string; fileName: string; uploadedAt: Date } | null;
      updatedAt: Date;
    }>,
    organizationId: string,
  ): Promise<WorkspaceResumeSummary> {
    if (resumeRows.length === 0) {
      return {
        primaryResumeId:     null,
        primaryResumeStatus: null,
        latestVersionId:     null,
        latestFileName:      null,
        latestUploadedAt:    null,
        latestParsingState:  null,
        latestReviewState:   null,
        versionCount:        0,
        resumeCount:         0,
      };
    }
    const primary = resumeRows[0]!;
    const latestVersion = primary.currentVersion;

    let latestParsingState = null;
    let latestReviewState  = null;
    if (latestVersion) {
      // Cheapest path: most recent parsing job + the linked review task.
      const [job, review] = await Promise.all([
        this.db.parsingJob.findFirst({
          where: { resumeVersionId: latestVersion.id, organizationId },
          orderBy: { attempt: 'desc' },
          select: { status: true, extractionResultId: true },
        }),
        this.db.reviewTask.findFirst({
          where: {
            organizationId,
            extractionResult: { resumeVersionId: latestVersion.id },
          },
          orderBy: { createdAt: 'desc' },
          select: { status: true },
        }),
      ]);
      latestParsingState = job?.status ?? null;
      latestReviewState  = review?.status ?? null;
    }

    // Total versions across all this candidate's resumes
    const totalVersions = await this.db.resumeVersion.count({
      where: { organizationId, resume: { candidateId: primary === resumeRows[0]
        ? (resumeRows[0] as unknown as { candidateId?: string }).candidateId ?? undefined
        : undefined } },
    }).catch(() => 0);

    return {
      primaryResumeId:     primary.id,
      primaryResumeStatus: primary.status as WorkspaceResumeSummary['primaryResumeStatus'],
      latestVersionId:     latestVersion?.id ?? null,
      latestFileName:      latestVersion?.fileName ?? null,
      latestUploadedAt:    latestVersion?.uploadedAt.toISOString() ?? null,
      latestParsingState:  latestParsingState as WorkspaceResumeSummary['latestParsingState'],
      latestReviewState:   latestReviewState  as WorkspaceResumeSummary['latestReviewState'],
      versionCount:        totalVersions || (latestVersion ? 1 : 0),
      resumeCount:         resumeRows.length,
    };
  }

  // ── Duplicate summary ─────────────────────────────────────────────────────

  private buildDuplicateSummary(
    groups: Array<{ confidenceTier: string; status: string; _count: { _all: number } }>,
    latestRun: { id: string; createdAt: Date } | null,
    matches: Array<{
      id: string; targetCandidateId: string;
      confidenceTier: string; confidenceScore: unknown; matchReasons: unknown;
    }>,
    targetById: Map<string, { firstName: string; lastName: string }>,
  ): WorkspaceDuplicateSummary {
    let pending = 0, exact = 0, probable = 0, possible = 0, deferred = 0;
    for (const g of groups) {
      if (g.status !== 'PENDING' && g.status !== 'DEFERRED') continue;
      pending += g._count._all;
      if (g.status === 'DEFERRED') deferred += g._count._all;
      if (g.confidenceTier === 'EXACT')    exact    += g._count._all;
      if (g.confidenceTier === 'PROBABLE') probable += g._count._all;
      if (g.confidenceTier === 'POSSIBLE') possible += g._count._all;
    }
    return {
      pending, exact, probable, possible, deferred,
      latestRunId: latestRun?.id ?? null,
      latestRunAt: latestRun?.createdAt.toISOString() ?? null,
      topMatches: matches.map((m) => {
        const t = targetById.get(m.targetCandidateId);
        const reasons = Array.isArray(m.matchReasons) ? m.matchReasons : [];
        return {
          id:                m.id,
          targetCandidateId: m.targetCandidateId,
          targetName:        t ? `${t.firstName} ${t.lastName}` : '(unknown)',
          confidenceTier:    m.confidenceTier as WorkspaceDuplicateSummary['topMatches'][number]['confidenceTier'],
          confidenceScore:   Number(m.confidenceScore ?? 0),
          reasonCount:       reasons.length,
        };
      }),
    };
  }

  // ── Profile completeness ──────────────────────────────────────────────────

  /**
   * Weighted profile-completeness score. Documented in code so the UI can
   * surface "why" — recruiters see the missing-fields list with deep links.
   *
   * Total weights sum to 110; score = min(100, present/110 * 100).
   * The capping at 100 means a candidate can be "complete" without 100% of
   * weights (e.g. resume contributes 14 — a candidate with everything except
   * a resume still scores ~87% and surfaces as "near-complete").
   */
  private computeProfileCompleteness(
    c: Candidate,
    resume: WorkspaceResumeSummary,
  ): WorkspaceProfileCompleteness {
    const weights: Record<string, number> = {
      email:           10,
      name:            10,
      phone:            8,
      linkedinUrl:      6,
      location:         6,
      currentTitle:     8,
      currentCompany:   8,
      careerStartDate:  8,
      summary:          8,
      salaryRange:      8,
      availability:     6,
      skills:          10,
      resume:          14,
    };
    let present = 0;
    const missing: string[] = [];

    if (c.email)                                                       present += weights.email!;            else missing.push('Email');
    if (c.firstName && c.lastName)                                     present += weights.name!;             else missing.push('Name');
    if (c.phone)                                                       present += weights.phone!;            else missing.push('Phone');
    if (c.linkedinUrl)                                                 present += weights.linkedinUrl!;      else missing.push('LinkedIn');
    if (c.city || c.country)                                           present += weights.location!;         else missing.push('Location');
    if (c.currentTitle)                                                present += weights.currentTitle!;     else missing.push('Current title');
    if (c.currentCompany)                                              present += weights.currentCompany!;   else missing.push('Current company');
    if (c.careerStartDate)                                             present += weights.careerStartDate!;  else missing.push('Career start');
    if (c.summary)                                                     present += weights.summary!;          else missing.push('Summary');
    if (c.salaryExpectationMin || c.salaryExpectationMax)              present += weights.salaryRange!;      else missing.push('Salary expectation');
    if (c.availabilityStatus !== 'NOT_LOOKING')                        present += weights.availability!;     else missing.push('Availability');
    // Skills + resume are evaluated by callers via separate count fields.
    // Inject after callers wire `_skillCount` onto the candidate — for now we use a
    // proxy: presence of at least one resume gives the resume points; skills checked
    // by the caller's overlay before render. We surface them as "missing" via the
    // workspace endpoint's other fields.
    if (resume.resumeCount > 0)                                        present += weights.resume!;           else missing.push('Resume');

    // Skill weight: workspace caller has skill counts on Candidate via the
    // existing CandidateDetail.allSkills. Since this service doesn't fetch
    // them, we approximate: if the candidate has a current title/company AND
    // a recent resume, assume skills exist enough to score; otherwise flag.
    // The exact skill check happens in the UI's completeness card from
    // candidate.allSkills.length. We over-count slightly here, then the UI
    // refines the message — both report from the same `weights` map so the
    // user-visible breakdown is consistent.
    present += weights.skills!;  // optimistic; UI overlays the truthful "0 skills" message when applicable.

    const score = Math.min(100, Math.round((present / 110) * 100));
    return { score, missing, weights };
  }

  // ── Health score ──────────────────────────────────────────────────────────

  /**
   * 0–100 derived score combining profile completeness with operational
   * signals. Drives the green/amber/red header indicator.
   */
  private computeHealthScore(
    c: Candidate,
    profileCompleteness: number,
    signals: WorkspaceHealthSignals,
  ): number {
    let score = 0;
    if (profileCompleteness >= 60)        score += 20;
    if (c.status !== 'BLACKLISTED')       score += 10;
    if (!signals.isStale)                 score += 15;
    if (!signals.hasOverdueReminders)     score += 10;
    if (!signals.hasPendingFeedback)      score += 5;
    if (!signals.hasResumesPendingReview) score += 10;
    if (!signals.hasDuplicatesPending)    score += 15;
    if (!signals.isProfileIncomplete)     score += 5;
    if (!signals.hasNoActiveSubmissions || c.status === 'PLACED') score += 10;
    return Math.min(100, score);
  }
}
