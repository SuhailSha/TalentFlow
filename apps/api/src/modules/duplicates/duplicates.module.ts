import { Module } from '@nestjs/common';

import { DuplicateDetectionService } from './duplicate-detection.service';
import { DuplicatesController } from './duplicates.controller';
import { DuplicatesRepository } from './duplicates.repository';
import { DuplicatesService } from './duplicates.service';

@Module({
  controllers: [DuplicatesController],
  providers:   [DuplicatesService, DuplicateDetectionService, DuplicatesRepository],
  exports:     [DuplicatesService, DuplicateDetectionService],
})
export class DuplicatesModule {}
