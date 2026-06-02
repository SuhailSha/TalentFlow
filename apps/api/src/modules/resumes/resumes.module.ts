import { Module } from '@nestjs/common';

import { ResumeIntakeBatchesController, ResumesController } from './resumes.controller';
import { ResumesRepository } from './resumes.repository';
import { ResumesService } from './resumes.service';

@Module({
  controllers: [ResumesController, ResumeIntakeBatchesController],
  providers:   [ResumesService, ResumesRepository],
  exports:     [ResumesService],
})
export class ResumesModule {}
