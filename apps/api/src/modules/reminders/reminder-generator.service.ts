import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { EventNames } from '../../common/events/event-names.constant';
import { RemindersService } from './reminders.service';

/**
 * Listens to domain events across the platform and auto-creates operational
 * reminders so recruiters always see what needs their attention.
 *
 * Every handler is fire-and-forget (returns void, swallows errors with logging)
 * so a reminder-creation failure never breaks the originating workflow.
 */
@Injectable()
export class ReminderGeneratorService {
  private readonly logger = new Logger(ReminderGeneratorService.name);

  constructor(
    private readonly reminders: RemindersService,
    private readonly db: PrismaService,
  ) {}

  // ── Interview: upcoming reminder ──────────────────────────────────────────

  @OnEvent(EventNames.INTERVIEW_SCHEDULED)
  async onInterviewScheduled(event: {
    interviewId:    string;
    submissionId:   string;
    candidateId:    string;
    organizationId: string;
    actorId:        string;
  }) {
    try {
      const interview = await this.db.interview.findUnique({
        where: { id: event.interviewId },
        select: {
          id: true, scheduledAt: true, round: true, roundLabel: true,
          type: true, ownerId: true, candidateId: true, submissionId: true,
          jobId: true,
          candidate: { select: { firstName: true, lastName: true } },
        },
      });
      if (!interview || !interview.scheduledAt) return;

      // Reminder due 24 hours before the scheduled time
      const dueAt = new Date(interview.scheduledAt.getTime() - 24 * 3_600_000);
      const roundDesc = interview.roundLabel ?? `Round ${interview.round}`;
      const candidateName = `${interview.candidate.firstName} ${interview.candidate.lastName}`;

      await this.reminders.createSystem({
        organizationId: event.organizationId,
        type:           'UPCOMING_INTERVIEW',
        priority:       dueAt < new Date() ? 'HIGH' : 'MEDIUM',
        title:          `Upcoming interview: ${candidateName} — ${roundDesc}`,
        description:    `${interview.type} interview scheduled. Confirm logistics and send briefing notes.`,
        dueAt,
        assigneeId:     interview.ownerId,
        createdById:    event.actorId,
        interviewId:    interview.id,
        submissionId:   interview.submissionId,
        candidateId:    interview.candidateId,
        jobId:          interview.jobId,
        metadata: {
          scheduledAt: interview.scheduledAt.toISOString(),
          interviewType: interview.type,
          round: interview.round,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to create UPCOMING_INTERVIEW reminder: ${(err as Error).message}`);
    }
  }

  // ── Interview: feedback pending reminder ──────────────────────────────────

  @OnEvent(EventNames.INTERVIEW_STATUS_CHANGED)
  async onInterviewStatusChanged(event: {
    interviewId:    string;
    toStatus:       string;
    submissionId:   string;
    candidateId:    string;
    organizationId: string;
    actorId:        string;
  }) {
    if (event.toStatus !== 'FEEDBACK_PENDING' && event.toStatus !== 'COMPLETED') return;

    try {
      const interview = await this.db.interview.findUnique({
        where: { id: event.interviewId },
        select: {
          id: true, round: true, roundLabel: true, ownerId: true,
          candidateId: true, submissionId: true, jobId: true,
          candidate: { select: { firstName: true, lastName: true } },
        },
      });
      if (!interview) return;

      // Check no existing open feedback reminder for this interview
      const existing = await this.db.reminder.findFirst({
        where: {
          interviewId:    interview.id,
          organizationId: event.organizationId,
          type:           'INTERVIEW_FEEDBACK_PENDING',
          status:         { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'] },
          deletedAt:      null,
        },
      });
      if (existing) return;

      const roundDesc = interview.roundLabel ?? `Round ${interview.round}`;
      const candidateName = `${interview.candidate.firstName} ${interview.candidate.lastName}`;
      const dueAt = new Date(Date.now() + 48 * 3_600_000); // 48 h to submit feedback

      await this.reminders.createSystem({
        organizationId: event.organizationId,
        type:           'INTERVIEW_FEEDBACK_PENDING',
        priority:       'HIGH',
        title:          `Submit feedback: ${candidateName} — ${roundDesc}`,
        description:    'Interview completed. Feedback submission is required to advance the candidate.',
        dueAt,
        assigneeId:     interview.ownerId,
        createdById:    event.actorId,
        interviewId:    interview.id,
        submissionId:   interview.submissionId,
        candidateId:    interview.candidateId,
        jobId:          interview.jobId,
      });
    } catch (err) {
      this.logger.warn(`Failed to create INTERVIEW_FEEDBACK_PENDING reminder: ${(err as Error).message}`);
    }
  }

  // ── Interview: auto-complete feedback reminder when feedback is submitted ──

  @OnEvent(EventNames.INTERVIEW_FEEDBACK_SUBMITTED)
  async onFeedbackSubmitted(event: {
    interviewId:    string;
    organizationId: string;
    actorId:        string;
  }) {
    try {
      // Complete any open feedback reminders for this interview
      const openReminders = await this.db.reminder.findMany({
        where: {
          interviewId:    event.interviewId,
          organizationId: event.organizationId,
          type:           'INTERVIEW_FEEDBACK_PENDING',
          status:         { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'] },
          deletedAt:      null,
        },
      });

      await Promise.all(
        openReminders.map(r =>
          this.db.reminder.update({
            where: { id: r.id },
            data:  { status: 'COMPLETED', completedAt: new Date() },
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(`Failed to auto-complete feedback reminders: ${(err as Error).message}`);
    }
  }

  // ── Submission: stalled workflow reminder ─────────────────────────────────

  @OnEvent(EventNames.SUBMISSION_CREATED)
  async onSubmissionCreated(event: {
    submissionId:   string;
    candidateId:    string;
    jobId:          string;
    organizationId: string;
    actorId:        string;
  }) {
    try {
      const submission = await this.db.submission.findUnique({
        where: { id: event.submissionId },
        select: {
          id: true, ownerId: true, candidateId: true, jobId: true,
          candidate: { select: { firstName: true, lastName: true } },
          job: { select: { reqId: true, title: true } },
        },
      });
      if (!submission) return;

      const candidateName = `${submission.candidate.firstName} ${submission.candidate.lastName}`;
      const dueAt = new Date(Date.now() + 7 * 24 * 3_600_000); // 7 days follow-up

      await this.reminders.createSystem({
        organizationId: event.organizationId,
        type:           'OVERDUE_SUBMISSION_FOLLOWUP',
        priority:       'LOW',
        title:          `Follow up on submission: ${candidateName} → ${submission.job.title}`,
        description:    `Submission created. Follow up with the client or advance the pipeline within 7 days.`,
        dueAt,
        assigneeId:     submission.ownerId,
        createdById:    event.actorId,
        submissionId:   submission.id,
        candidateId:    submission.candidateId,
        jobId:          submission.jobId,
        metadata: { reqId: submission.job.reqId },
      });
    } catch (err) {
      this.logger.warn(`Failed to create OVERDUE_SUBMISSION_FOLLOWUP reminder: ${(err as Error).message}`);
    }
  }
}
