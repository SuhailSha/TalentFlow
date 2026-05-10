import { Module } from '@nestjs/common';

import { CandidatesController, SkillsController } from './candidates.controller';
import { CandidatesRepository } from './candidates.repository';
import { CandidatesService } from './candidates.service';
import { SkillsService } from './skills.service';

// EventEmitterModule is @Global() via AppModule — no need to import here.
// CandidatesService injects EventEmitter2 which is globally available.

@Module({
  controllers: [CandidatesController, SkillsController],
  providers: [CandidatesService, SkillsService, CandidatesRepository],
  exports: [CandidatesService, SkillsService],
})
export class CandidatesModule {}
