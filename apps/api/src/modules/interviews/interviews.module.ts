import { Module } from '@nestjs/common';

import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { InterviewsRepository } from './interviews.repository';

@Module({
  controllers: [InterviewsController],
  providers: [InterviewsService, InterviewsRepository],
  exports: [InterviewsService],
})
export class InterviewsModule {}
