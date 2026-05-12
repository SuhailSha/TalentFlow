import { Module } from '@nestjs/common';

import { InterviewsBulkController } from './interviews-bulk.controller';
import { InterviewsBulkService } from './interviews-bulk.service';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { InterviewsRepository } from './interviews.repository';

@Module({
  controllers: [InterviewsController, InterviewsBulkController],
  providers:   [InterviewsService, InterviewsRepository, InterviewsBulkService],
  exports:     [InterviewsService],
})
export class InterviewsModule {}
