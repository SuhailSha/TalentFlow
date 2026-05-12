import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import type { EnvConfig } from '../config';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * Sends interview_upcoming emails for active interviews scheduled in the next
 * 24-26h window.
 *
 * Why a 2h window (24h-26h) instead of a single slice: the cron fires hourly,
 * so a 2h target window with 1h cron frequency means each interview falls
 * inside the window for two runs. Dedup is provided by the EmailDelivery
 * row check — if an interview_upcoming email already exists, skip.
 *
 * Catches the case where an interview was scheduled days in advance
 * (NotificationsService.onInterviewScheduled skips email beyond 24h).
 */
@Injectable()
export class UpcomingInterviewNotifierCron {
  private readonly logger = new Logger(UpcomingInterviewNotifierCron.name);

  constructor(
    private readonly db: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async notifyUpcomingInterviews() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 26 * 60 * 60 * 1000);

    const interviews = await this.db.interview.findMany({
      where: {
        deletedAt: null,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] },
        scheduledAt: { gte: windowStart, lte: windowEnd },
        interviewerId: { not: null },
      },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        job:       { select: { title: true } },
      },
      take: 200,
    });

    if (interviews.length === 0) return;

    // Dedup: skip any interview that already has an interview_upcoming email.
    const existing = await this.db.emailDelivery.findMany({
      where: {
        template:     'interview_upcoming',
        resourceType: 'Interview',
        resourceId:   { in: interviews.map((i) => i.id) },
      },
      select: { resourceId: true },
    });
    const alreadySent = new Set(existing.map((d) => d.resourceId).filter(Boolean));
    const targets = interviews.filter((i) => !alreadySent.has(i.id));

    if (targets.length === 0) return;

    const appUrl = this.config.get('APP_URL', { infer: true });
    let dispatched = 0;
    for (const iv of targets) {
      if (!iv.interviewerId || !iv.scheduledAt) continue;

      const interviewer = await this.db.user.findUnique({
        where: { id: iv.interviewerId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      if (!interviewer) continue;

      const settings = await this.db.organizationSettings.findUnique({
        where: { organizationId: iv.organizationId },
        select: { emailNotificationsEnabled: true },
      });
      if (settings && !settings.emailNotificationsEnabled) continue;

      try {
        await this.email.send({
          template:       'interview_upcoming',
          to:             interviewer.email,
          organizationId: iv.organizationId,
          recipientUserId: interviewer.id,
          resourceType:   'Interview',
          resourceId:     iv.id,
          payload: {
            recipientName:    `${interviewer.firstName} ${interviewer.lastName}`.trim(),
            candidateName:    `${iv.candidate.firstName} ${iv.candidate.lastName}`.trim(),
            jobTitle:         iv.job.title,
            scheduledAtHuman: iv.scheduledAt.toLocaleString(),
            interviewUrl:     `${appUrl}/interviews/${iv.id}`,
          },
        });
        dispatched++;
      } catch (err) {
        this.logger.error({ err, interviewId: iv.id }, 'Failed to dispatch upcoming-interview email');
      }
    }
    if (dispatched > 0) {
      this.logger.log({ dispatched }, 'Dispatched upcoming-interview emails');
    }
  }
}
