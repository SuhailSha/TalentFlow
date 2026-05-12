import { Module } from '@nestjs/common';

import { RemindersModule } from '../reminders/reminders.module';
import { CandidatesBulkController } from './candidates-bulk.controller';
import { CandidatesBulkService } from './candidates-bulk.service';
import { CandidatesController, SkillsController } from './candidates.controller';
import { CandidatesRepository } from './candidates.repository';
import { CandidatesService } from './candidates.service';
import { SkillsService } from './skills.service';

// EventEmitterModule is @Global() via AppModule — no need to import here.
// CandidatesService injects EventEmitter2 which is globally available.

@Module({
  imports:     [RemindersModule],
  controllers: [CandidatesController, SkillsController, CandidatesBulkController],
  providers:   [CandidatesService, SkillsService, CandidatesRepository, CandidatesBulkService],
  exports:     [CandidatesService, SkillsService],
})
export class CandidatesModule {}
