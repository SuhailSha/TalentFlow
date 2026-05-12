import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { EventNames } from '../common/events/event-names.constant';
import { PrismaService } from '../database/prisma.service';

/**
 * Promotes PENDING reminders whose dueAt has passed to EXPIRED.
 *
 * Mirrors the FSM comment on ReminderStatus.EXPIRED: "past due date with no
 * action; set by scheduled job". Emits REMINDER_OVERDUE for each escalation
 * so the activity log captures it.
 *
 * Frequency: every 10 minutes is granular enough for recruiter UX without
 * thrashing the DB.
 */
@Injectable()
export class ReminderEscalatorCron {
  private readonly logger = new Logger(ReminderEscalatorCron.name);

  constructor(
    private readonly db: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async escalatePastDueReminders() {
    const overdue = await this.db.reminder.findMany({
      where: {
        status: 'PENDING',
        dueAt: { lt: new Date() },
      },
      select: { id: true, organizationId: true, assigneeId: true, type: true },
      take: 100, // batch — avoids long-running update if backlog is huge
    });

    if (overdue.length === 0) return;

    await this.db.reminder.updateMany({
      where: { id: { in: overdue.map((r) => r.id) } },
      data:  { status: 'EXPIRED' },
    });

    for (const r of overdue) {
      this.events.emit(EventNames.REMINDER_OVERDUE, {
        reminderId:     r.id,
        organizationId: r.organizationId,
        assigneeId:     r.assigneeId,
        type:           r.type,
      });
    }

    this.logger.log({ expiredCount: overdue.length }, 'Escalated overdue reminders');
  }
}
