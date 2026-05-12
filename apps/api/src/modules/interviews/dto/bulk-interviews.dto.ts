import { InterviewStatus, NoteType } from '@repo/database';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { BulkIdsDto } from '../../../common/bulk/bulk-ids.dto';

export class BulkChangeInterviewStatusDto extends BulkIdsDto {
  @IsEnum(InterviewStatus)
  status!: InterviewStatus;

  /**
   * Required by the per-record service for transitions to CANCELLED or
   * NO_SHOW. Optional here; per-id failures surface when missing.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class BulkAddInterviewNoteDto extends BulkIdsDto {
  @IsString()
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsEnum(NoteType)
  noteType?: NoteType;
}
