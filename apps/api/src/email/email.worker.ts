import { Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { BaseWorker } from '../queue/base.worker';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { EmailService, type EmailJobData } from './email.service';

const EMAIL_WORKER_CONCURRENCY = Number(process.env['EMAIL_WORKER_CONCURRENCY'] ?? '4');

/**
 * EmailWorker — consumes the `notification-email` queue.
 *
 * The job carries only the deliveryId; EmailService loads the row, sends via
 * the configured provider, and updates status. Throwing here re-routes through
 * BullMQ's retry/back-off (DEFAULT_JOB_OPTIONS in queue.constants.ts).
 *
 * Concurrency is read from EMAIL_WORKER_CONCURRENCY at process start (the
 * @Processor decorator runs before ConfigModule, so we can't inject Config).
 * Default 4 keeps us well under typical SMTP rate limits.
 *
 * Worker is registered only when REDIS_ENABLED=true (see EmailModule).
 */
@Processor(QUEUE_NAMES.NOTIFICATION_EMAIL, { concurrency: EMAIL_WORKER_CONCURRENCY })
export class EmailWorker extends BaseWorker<EmailJobData> {
  protected readonly logger = new Logger(EmailWorker.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  protected async execute(job: Job<EmailJobData>): Promise<void> {
    await this.emailService.processDelivery(job.data.deliveryId);
  }
}
