import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database';
import type { RequestUser } from '../../auth/types/request-user.interface';

const STALE_DAYS = 7;
const UPCOMING_DAYS = 7;
const ACTIVE_SUBMISSION_STATUSES = [
  'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED',
] as const;
const ACTIVE_INTERVIEW_STATUSES = [
  'SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS',
] as const;
const FEEDBACK_PENDING_STATUSES = ['COMPLETED', 'FEEDBACK_PENDING'] as const;

@Injectable()
export class DashboardService {
  constructor(private readonly db: PrismaService) {}

  /**
   * Single-trip aggregation for the recruiter command center.
   * Combines counts + small lists in one response so the page renders without
   * a waterfall of fetches.
   */
  async commandCenter(user: RequestUser) {
    const orgId = user.organizationId;
    const now   = new Date();
    const staleCutoff   = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);
    const upcomingCutoff = new Date(now.getTime() + UPCOMING_DAYS * 24 * 60 * 60 * 1000);
    const next24h        = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [
      overdueReminders,
      urgentReminders,
      pendingFeedbackCount,
      pendingFeedbackList,
      upcomingInterviews,
      upcomingNext24h,
      upcomingInterviewList,
      stalledSubmissions,
      stalledSubmissionList,
      activeJobsCount,
      activeCandidatesCount,
      recruiterWorkload,
    ] = await Promise.all([
      // Overdue reminders count (any active status, dueAt in past)
      this.db.reminder.count({
        where: {
          organizationId: orgId,
          status: { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'] },
          dueAt: { lt: now },
        },
      }),
      // Urgent reminders list (CRITICAL priority OR overdue)
      this.db.reminder.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'] },
          OR: [{ priority: 'CRITICAL' }, { dueAt: { lt: now } }],
        },
        select: {
          id: true, title: true, dueAt: true, priority: true, status: true,
          candidateId: true, submissionId: true, interviewId: true, jobId: true,
        },
        orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
        take: 10,
      }),
      // Interviews awaiting feedback (count)
      this.db.interview.count({
        where: {
          organizationId: orgId,
          status: { in: [...FEEDBACK_PENDING_STATUSES] },
          deletedAt: null,
        },
      }),
      // Interviews awaiting feedback (list)
      this.db.interview.findMany({
        where: {
          organizationId: orgId,
          status: { in: [...FEEDBACK_PENDING_STATUSES] },
          deletedAt: null,
        },
        select: {
          id: true, round: true, roundLabel: true, completedAt: true, status: true,
          candidate: { select: { id: true, firstName: true, lastName: true } },
          job: { select: { id: true, title: true, reqId: true } },
        },
        orderBy: { completedAt: 'asc' },
        take: 10,
      }),
      // Upcoming interviews count (7 days)
      this.db.interview.count({
        where: {
          organizationId: orgId,
          status: { in: [...ACTIVE_INTERVIEW_STATUSES] },
          scheduledAt: { gte: now, lte: upcomingCutoff },
          deletedAt: null,
        },
      }),
      // Upcoming interviews next 24h count
      this.db.interview.count({
        where: {
          organizationId: orgId,
          status: { in: [...ACTIVE_INTERVIEW_STATUSES] },
          scheduledAt: { gte: now, lte: next24h },
          deletedAt: null,
        },
      }),
      // Upcoming interviews list
      this.db.interview.findMany({
        where: {
          organizationId: orgId,
          status: { in: [...ACTIVE_INTERVIEW_STATUSES] },
          scheduledAt: { gte: now, lte: upcomingCutoff },
          deletedAt: null,
        },
        select: {
          id: true, scheduledAt: true, status: true, round: true, roundLabel: true, type: true,
          candidate: { select: { id: true, firstName: true, lastName: true } },
          job: { select: { id: true, title: true, reqId: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      }),
      // Stalled submissions count
      this.db.submission.count({
        where: {
          organizationId: orgId,
          status: { in: [...ACTIVE_SUBMISSION_STATUSES] },
          updatedAt: { lt: staleCutoff },
          deletedAt: null,
        },
      }),
      // Stalled submissions list
      this.db.submission.findMany({
        where: {
          organizationId: orgId,
          status: { in: [...ACTIVE_SUBMISSION_STATUSES] },
          updatedAt: { lt: staleCutoff },
          deletedAt: null,
        },
        select: {
          id: true, status: true, updatedAt: true,
          candidate: { select: { id: true, firstName: true, lastName: true } },
          job: { select: { id: true, title: true, reqId: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      }),
      // Active jobs (OPEN)
      this.db.jobDescription.count({
        where: { organizationId: orgId, status: 'OPEN', deletedAt: null },
      }),
      // Active candidates (ACTIVE or AVAILABLE)
      this.db.candidate.count({
        where: { organizationId: orgId, status: { in: ['ACTIVE', 'AVAILABLE'] }, deletedAt: null },
      }),
      // Recruiter workload — top 5 by active submission count
      this.db.submission.groupBy({
        by: ['ownerId'],
        where: {
          organizationId: orgId,
          status: { in: [...ACTIVE_SUBMISSION_STATUSES] },
          deletedAt: null,
        },
        _count: { _all: true },
        orderBy: { _count: { ownerId: 'desc' } },
        take: 5,
      }),
    ]);

    // Enrich recruiter workload with user info
    const ownerIds = recruiterWorkload.map((r) => r.ownerId);
    const owners = ownerIds.length > 0
      ? await this.db.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const ownerMap = new Map(owners.map((u) => [u.id, u]));

    return {
      metrics: {
        overdueReminders:    { count: overdueReminders },
        pendingFeedback:     { count: pendingFeedbackCount },
        upcomingInterviews:  { count: upcomingInterviews, next24h: upcomingNext24h },
        stalledSubmissions:  { count: stalledSubmissions },
        activeJobs:          { count: activeJobsCount },
        activeCandidates:    { count: activeCandidatesCount },
      },
      urgentReminders: urgentReminders.map((r) => ({
        id: r.id, title: r.title, dueAt: r.dueAt?.toISOString() ?? null,
        priority: r.priority, status: r.status,
        candidateId: r.candidateId, submissionId: r.submissionId,
        interviewId: r.interviewId, jobId: r.jobId,
      })),
      pendingFeedbackList: pendingFeedbackList.map((iv) => ({
        id: iv.id, round: iv.round, roundLabel: iv.roundLabel,
        completedAt: iv.completedAt?.toISOString() ?? null, status: iv.status,
        candidateId: iv.candidate.id,
        candidateName: `${iv.candidate.firstName} ${iv.candidate.lastName}`,
        jobId: iv.job.id, jobTitle: iv.job.title, jobReqId: iv.job.reqId,
      })),
      upcomingInterviewList: upcomingInterviewList.map((iv) => ({
        id: iv.id, scheduledAt: iv.scheduledAt?.toISOString() ?? null,
        status: iv.status, round: iv.round, roundLabel: iv.roundLabel, type: iv.type,
        candidateId: iv.candidate.id,
        candidateName: `${iv.candidate.firstName} ${iv.candidate.lastName}`,
        jobId: iv.job.id, jobTitle: iv.job.title, jobReqId: iv.job.reqId,
      })),
      stalledSubmissionList: stalledSubmissionList.map((s) => ({
        id: s.id, status: s.status, updatedAt: s.updatedAt.toISOString(),
        daysStalled: Math.floor((now.getTime() - s.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        candidateId: s.candidate.id,
        candidateName: `${s.candidate.firstName} ${s.candidate.lastName}`,
        jobId: s.job.id, jobTitle: s.job.title, jobReqId: s.job.reqId,
      })),
      recruiterWorkload: recruiterWorkload.map((r) => {
        const u = ownerMap.get(r.ownerId);
        return {
          userId: r.ownerId,
          name: u ? `${u.firstName} ${u.lastName}` : 'Unknown',
          email: u?.email ?? null,
          activeSubmissions: r._count._all,
        };
      }),
    };
  }
}
