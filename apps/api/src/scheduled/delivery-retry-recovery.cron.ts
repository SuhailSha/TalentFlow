import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailDeliveryStatus } from '@repo/database';
import type { Queue } from 'bullmq';

import { type PrismaService } from '../database/prisma.service';
import type { EmailJobData } from '../email/email.service';
import { JOB_NAMES, QUEUE_NAMES } from '../queue/queue.constants';

const STUCK_QUEUED_MINUTES = 30;

/**
 * Recovers email deliveries that have been stuck in QUEUED for too long.
 *
 * How a row gets stuck: worker crashed mid-process, Redis dropped the job,
 * BullMQ failed to deliver it back, etc. The DB row remains QUEUED but no
 * BullMQ job exists to drive it.
 *
 * The cron re-enqueues the deliveryId. Job idempotency (jobId === deliveryId
 * in EmailService.send) means BullMQ will accept the new job. The worker's
 * processDelivery() will detect SENT state and short-circuit if the email
 * actually did go out and the DB just didn't get updated.
 *
 * No-op when Redis is disabled — without a queue there's no recovery to do
 * (the synchronous fallback never produces stuck rows).
 */
@Injectable()
export class DeliveryRetryRecoveryCron {
  private readonly logger = new Logger(DeliveryRetryRecoveryCron.name);

  constructor(
    private readonly db: PrismaService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.NOTIFICATION_EMAIL)
    private readonly queue?: Queue<EmailJobData>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async recoverStuckDeliveries() {
    if (!this.queue) return; // no Redis -> no stuck rows to recover

    // Skip in development to avoid Neon auto-pause issues
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    try {
      const cutoff = new Date(Date.now() - STUCK_QUEUED_MINUTES * 60 * 1000);

      // Add retry logic for database connection issues (Neon auto-pause)
      let retries = 3;
      let stuck: { id: string }[] = [];

      while (retries > 0) {
        try {
          stuck = await this.db.emailDelivery.findMany({
            where: {
              // PENDING happens when Redis was unreachable at send-time and the
              // row was created without an associated BullMQ job. QUEUED is the
              // worker-crash case (job exists in BullMQ but never processed).
              status: { in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.QUEUED] },
              createdAt: { lt: cutoff },
              // Don't requeue rows that were already attempted recently — the worker
              // may just be slow rather than dead.
              OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: cutoff } }],
            },
            select: { id: true },
            take: 50,
          });
          break; // Success, exit retry loop
        } catch (error: unknown) {
          if ((error as { code?: string }).code === 'P1001' && retries > 1) {
            // Database connection error, likely Neon auto-pause
            this.logger.warn(
              `Database connection failed (attempt ${4 - retries}/3), retrying in 2s...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s
            retries--;
            continue;
          }
          throw error; // Re-throw if not connection issue or out of retries
        }
      }

      if (stuck.length === 0) return;

      let recoveredCount = 0;
      for (const row of stuck) {
        try {
          await this.queue.add(JOB_NAMES.EMAIL_SEND, { deliveryId: row.id }, { jobId: row.id });
          // Promote PENDING -> QUEUED so the next cron run doesn't re-enqueue
          // (BullMQ would reject duplicate jobId anyway, but the log noise is
          // worth avoiding).
          await this.db.emailDelivery.update({
            where: { id: row.id },
            data: { status: EmailDeliveryStatus.QUEUED, failureReason: null },
          });
          recoveredCount++;
        } catch (err) {
          this.logger.error({ err, deliveryId: row.id }, 'Failed to re-enqueue stuck delivery');
        }
      }

      if (recoveredCount > 0) {
        this.logger.log({ recoveredCount }, 'Re-enqueued stuck email deliveries');
      }
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P1001') {
        this.logger.warn(
          'Database temporarily unavailable (likely auto-paused), skipping this cycle',
        );
        return;
      }
      this.logger.error({ error }, 'Cron job failed');
      // Don't re-throw to prevent app crash
    }
  }
}
