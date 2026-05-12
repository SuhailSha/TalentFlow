import { Module } from '@nestjs/common';

import { DeliveryRetryRecoveryCron } from './delivery-retry-recovery.cron';
import { InvitationExpirerCron } from './invitation-expirer.cron';
import { ReminderEscalatorCron } from './reminder-escalator.cron';
import { UpcomingInterviewNotifierCron } from './upcoming-interview-notifier.cron';

/**
 * ScheduledModule — registers all @Cron-decorated services.
 *
 * NestJS's ScheduleModule.forRoot() (registered in AppModule) discovers
 * @Cron metadata via the providers listed here. No explicit registration
 * is needed beyond standard provider declaration.
 *
 * Single-instance assumption: see individual cron files for the comment
 * about multi-instance deployment.
 */
@Module({
  providers: [
    InvitationExpirerCron,
    ReminderEscalatorCron,
    UpcomingInterviewNotifierCron,
    DeliveryRetryRecoveryCron,
  ],
})
export class ScheduledModule {}
