import { Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { BaseWorker } from '../queue/base.worker';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { EmailService, type EmailJobData } from './email.service';

/**
 * EmailWorker — consumes the `notification-email` queue.
 *
 * The job carries only the deliveryId; EmailService loads the row, sends via
 * the configured provider, and updates status. Throwing here re-routes through
 * BullMQ's retry/back-off (DEFAULT_JOB_OPTIONS in queue.constants.ts).
 *
 * Worker is registered only when REDIS_ENABLED=true (see EmailModule).
 */
@Processor(QUEUE_NAMES.NOTIFICATION_EMAIL, { concurrency: 4 })
export class EmailWorker extends BaseWorker<EmailJobData> {
  protected readonly logger = new Logger(EmailWorker.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  protected async execute(job: Job<EmailJobData>): Promise<void> {
    await this.emailService.processDelivery(job.data.deliveryId);
  }
}
