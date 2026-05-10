import { Module } from '@nestjs/common';

import { CandidatesModule } from '../candidates/candidates.module';
import { JobsController } from './jobs.controller';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';

// EventEmitterModule is @Global() via AppModule — no need to import here.
// SkillsService is re-used from CandidatesModule (exported from there).

@Module({
  imports: [CandidatesModule],
  controllers: [JobsController],
  providers: [JobsService, JobsRepository],
  exports: [JobsService],
})
export class JobsModule {}
