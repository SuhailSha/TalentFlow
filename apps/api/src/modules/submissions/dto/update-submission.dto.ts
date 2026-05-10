import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsUUID } from 'class-validator';

import { CreateSubmissionDto } from './create-submission.dto';

export class UpdateSubmissionDto extends PartialType(CreateSubmissionDto) {
  @IsOptional()
  @IsUUID('4')
  ownerId?: string;
}
