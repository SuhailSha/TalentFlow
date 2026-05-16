import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  InterviewStatus,
  Prisma,
  ReminderStatus,
  SubmissionStatus,
} from '@repo/database';

import { PrismaService } from '../../database/prisma.service';
import { VendorsService } from './vendors.service';
import type { VendorDetail } from './types/vendor.types';

const ACTIVE_SUBMISSION_STATUSES: SubmissionStatus[] = [
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'ON_HOLD',
];

const ACTIVE_INTERVIEW_STATUSES: InterviewStatus[] = [
  'SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS',
];

const OPEN_REMINDER_STATUSES: ReminderStatus[] = ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'];

const STALLED_SUBMISSION_DAYS = 7;
const STALE_VENDOR_DAYS       = 30;
const INACTIVE_VENDOR_DAYS    = 60;

export interface VendorMetrics {
  totalSubmissions:         number;
  activeSubmissions:        number;
  placements:               { allTime: number; thisMonth: number };
  activeInterviews:         number;
  feedbackPendingCount:     number;
  openReminders:            number;
  stalledSubmissions:       number;
  lastSubmissionAt:         string | null;
  daysSinceLastSubmission:  number | null;
}

export interface VendorPipelineSummary {
  // Keyed by SubmissionStatus, count of submissions in that stage (active only).
  [stage: string]: number;
}

export interface VendorActiveSubmission {
  id:           string;
  status:       SubmissionStatus;
  candidate:    { id: string; firstName: string; lastName: string; email: string };
  job:          { id: string; reqId: string; title: string };
  owner:        { id: string; firstName: string; lastName: string };
  submittedAt:  string | null;
  updatedAt:    string;
  daysStalled:  number;
}

export interface VendorUpcomingInterview {
  id:            string;
  scheduledAt:   string | null;
  status:        InterviewStatus;
  round:         number;
  candidate:     { id: string; firstName: string; lastName: string };
  job:           { id: string; reqId: string; title: string };
}

export interface VendorOpenReminder {
  id:          string;
  title:       string;
  description: string | null;
  dueAt:       string | null;
  priority:    string;
  status:      ReminderStatus;
  submissionId: string | null;
  interviewId:  string | null;
}

export interface VendorRecruiter {
  userId:        string;
  name:          string;
  email:         string;
  activeCount:   number;
}

export interface VendorHealthSignals {
  isStalled:           boolean;
  isInactive:          boolean;
  noRecentSubmissions: boolean;
  hasOverdueReminders: boolean;
  hasPendingFeedback:  boolean;
}

export interface VendorWorkspaceResponse {
  vendor:             VendorDetail;
  metrics:            VendorMetrics;
  pipeline:           VendorPipelineSummary;
  activeSubmissions:  VendorActiveSubmission[];
  upcomingInterviews: VendorUpcomingInterview[];
  openReminders:      VendorOpenReminder[];
  topRecruiters:      VendorRecruiter[];
  health:             VendorHealthSignals;
}

/**
 * Single-trip aggregation backing the vendor workspace page.
 *
 * Reuses VendorsService.findById for the canonical detail shape, then runs
 * eight parallel queries that all filter by vendorId (no fan-out across
 * tenants). Cheap on writes — vendors are bounded entities — so live
 * computation is fine; no caching needed at this scale.
 *
 * Operational signals (isStalled / isInactive / etc.) are derived here so
 * the frontend never has to re-implement the rules.
 */
@Injectable()
export class VendorWorkspaceService {
  constructor(
    private readonly db: PrismaService,
    private readonly vendors: VendorsService,
  ) {}

  async getWorkspace(vendorId: string, organizationId: string): Promise<VendorWorkspaceResponse> {
    const vendor = await this.vendors.findById(vendorId, organizationId);
    if (!vendor) throw new NotFoundException('Vendor not found');

    const now             = new Date();
    const stalledCutoff   = new Date(now.getTime() - STALLED_SUBMISSION_DAYS * 24 * 60 * 60 * 1000);
    const inactiveCutoff  = new Date(now.getTime() - INACTIVE_VENDOR_DAYS    * 24 * 60 * 60 * 1000);
    const upcomingCutoff  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthStart      = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseWhere: Prisma.SubmissionWhereInput = {
      organizationId,
      vendorId,
      deletedAt: null,
    };

    const [
      pipelineGroups,
      placementsAllTime,
      placementsThisMonth,
      activeSubmissions,
      lastSubmission,
      stalledSubmissionCount,
      activeInterviewsCount,
      upcomingInterviews,
      feedbackPendingInterviews,
      openReminderRows,
      ownerGroups,
    ] = await Promise.all([
      // Pipeline counts — group active submissions by status
      this.db.submission.groupBy({
        by: ['status'],
        where: { ...baseWhere },
        _count: { _all: true },
      }),
      this.db.submission.count({ where: { ...baseWhere, status: 'PLACED' } }),
      this.db.submission.count({
        where: { ...baseWhere, status: 'PLACED', placedAt: { gte: monthStart } },
      }),
      // Active submissions — top 12 most recently touched
      this.db.submission.findMany({
        where: { ...baseWhere, status: { in: ACTIVE_SUBMISSION_STATUSES } },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        select: {
          id: true, status: true, submittedAt: true, updatedAt: true,
          candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
          job:       { select: { id: true, reqId: true, title: true } },
          owner:     { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      // Last submission (any status)
      this.db.submission.findFirst({
        where: { ...baseWhere },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      // Stalled active submissions count
      this.db.submission.count({
        where: {
          ...baseWhere,
          status: { in: ACTIVE_SUBMISSION_STATUSES },
          updatedAt: { lt: stalledCutoff },
        },
      }),
      // Active interviews across this vendor's submissions
      this.db.interview.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: ACTIVE_INTERVIEW_STATUSES },
          submission: { vendorId },
        },
      }),
      // Upcoming interviews (next 7 days) — top 10
      this.db.interview.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: ACTIVE_INTERVIEW_STATUSES },
          scheduledAt: { gte: now, lte: upcomingCutoff },
          submission: { vendorId },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
        select: {
          id: true, scheduledAt: true, status: true, round: true,
          candidate: { select: { id: true, firstName: true, lastName: true } },
          job:       { select: { id: true, reqId: true, title: true } },
        },
      }),
      // Feedback-pending interviews (no submitted feedback yet)
      this.db.interview.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: ['COMPLETED', 'FEEDBACK_PENDING'] },
          submission: { vendorId },
          feedback: { none: { isSubmitted: true } },
        },
      }),
      // Open reminders linked to this vendor's submissions OR interviews
      this.db.reminder.findMany({
        where: {
          organizationId,
          status: { in: OPEN_REMINDER_STATUSES },
          OR: [
            { submission: { vendorId } },
            { interview:  { submission: { vendorId } } },
          ],
        },
        orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }],
        take: 10,
        select: {
          id: true, title: true, description: true, dueAt: true,
          priority: true, status: true,
          submissionId: true, interviewId: true,
        },
      }),
      // Recruiters who own active submissions for this vendor
      this.db.submission.groupBy({
        by: ['ownerId'],
        where: { ...baseWhere, status: { in: ACTIVE_SUBMISSION_STATUSES } },
        _count: { _all: true },
        orderBy: { _count: { ownerId: 'desc' } },
        take: 5,
      }),
    ]);

    // ── Pipeline ──────────────────────────────────────────────────────────────
    const pipeline: VendorPipelineSummary = {};
    let activeSubmissionCount = 0;
    for (const g of pipelineGroups) {
      pipeline[g.status] = g._count._all;
      if ((ACTIVE_SUBMISSION_STATUSES as readonly string[]).includes(g.status)) {
        activeSubmissionCount += g._count._all;
      }
    }
    const totalSubmissionCount = pipelineGroups.reduce((sum, g) => sum + g._count._all, 0);

    // ── Active submissions decoration ─────────────────────────────────────────
    const activeSubs: VendorActiveSubmission[] = activeSubmissions.map((s) => ({
      id:          s.id,
      status:      s.status,
      candidate:   s.candidate,
      job:         s.job,
      owner:       s.owner,
      submittedAt: s.submittedAt?.toISOString() ?? null,
      updatedAt:   s.updatedAt.toISOString(),
      daysStalled: Math.floor((now.getTime() - s.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // ── Upcoming interviews ───────────────────────────────────────────────────
    const upcomingIvs: VendorUpcomingInterview[] = upcomingInterviews.map((iv) => ({
      id:          iv.id,
      scheduledAt: iv.scheduledAt?.toISOString() ?? null,
      status:      iv.status,
      round:       iv.round,
      candidate:   iv.candidate,
      job:         iv.job,
    }));

    // ── Open reminders ────────────────────────────────────────────────────────
    const reminders: VendorOpenReminder[] = openReminderRows.map((r) => ({
      id:           r.id,
      title:        r.title,
      description:  r.description,
      dueAt:        r.dueAt?.toISOString() ?? null,
      priority:     r.priority,
      status:       r.status,
      submissionId: r.submissionId,
      interviewId:  r.interviewId,
    }));

    // ── Top recruiters: hydrate user info ─────────────────────────────────────
    const ownerIds = ownerGroups.map((g) => g.ownerId);
    const owners = ownerIds.length > 0
      ? await this.db.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const ownerMap = new Map(owners.map((u) => [u.id, u]));
    const topRecruiters: VendorRecruiter[] = ownerGroups.map((g) => {
      const u = ownerMap.get(g.ownerId);
      return {
        userId:      g.ownerId,
        name:        u ? `${u.firstName} ${u.lastName}`.trim() : 'Unknown',
        email:       u?.email ?? '',
        activeCount: g._count._all,
      };
    });

    // ── Metrics ───────────────────────────────────────────────────────────────
    const daysSinceLastSubmission = lastSubmission
      ? Math.floor((now.getTime() - lastSubmission.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const overdueReminderCount = reminders.filter(
      (r) => r.dueAt && new Date(r.dueAt).getTime() < now.getTime(),
    ).length;

    const metrics: VendorMetrics = {
      totalSubmissions:        totalSubmissionCount,
      activeSubmissions:       activeSubmissionCount,
      placements:              { allTime: placementsAllTime, thisMonth: placementsThisMonth },
      activeInterviews:        activeInterviewsCount,
      feedbackPendingCount:    feedbackPendingInterviews,
      openReminders:           openReminderRows.length,
      stalledSubmissions:      stalledSubmissionCount,
      lastSubmissionAt:        lastSubmission?.createdAt.toISOString() ?? null,
      daysSinceLastSubmission,
    };

    // ── Health signals ────────────────────────────────────────────────────────
    const lastSubmissionDate = lastSubmission?.createdAt ?? null;
    const noActivityInWindow = (windowStart: Date): boolean =>
      lastSubmissionDate === null || lastSubmissionDate < windowStart;

    const isInactiveStatus = vendor.status === 'INACTIVE' || vendor.status === 'BLOCKED' || vendor.status === 'ARCHIVED';
    const health: VendorHealthSignals = {
      isStalled: vendor.status === 'ACTIVE' && noActivityInWindow(
        new Date(now.getTime() - STALE_VENDOR_DAYS * 24 * 60 * 60 * 1000),
      ),
      isInactive: isInactiveStatus || noActivityInWindow(inactiveCutoff),
      noRecentSubmissions: noActivityInWindow(inactiveCutoff),
      hasOverdueReminders: overdueReminderCount > 0,
      hasPendingFeedback:  feedbackPendingInterviews > 0,
    };

    return {
      vendor,
      metrics,
      pipeline,
      activeSubmissions:  activeSubs,
      upcomingInterviews: upcomingIvs,
      openReminders:      reminders,
      topRecruiters,
      health,
    };
  }
}
