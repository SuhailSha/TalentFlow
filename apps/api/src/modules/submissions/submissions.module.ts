import { Module } from '@nestjs/common';

import { RemindersModule } from '../reminders/reminders.module';
import { SubmissionsBulkController } from './submissions-bulk.controller';
import { SubmissionsBulkService } from './submissions-bulk.service';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsRepository } from './submissions.repository';
import { SubmissionsService } from './submissions.service';

@Module({
  imports:     [RemindersModule],
  controllers: [SubmissionsController, SubmissionsBulkController],
  providers:   [SubmissionsService, SubmissionsRepository, SubmissionsBulkService],
  exports:     [SubmissionsService],
})
export class SubmissionsModule {}
