import {
  CandidateStatus,
  NoteType,
  ReminderPriority as ReminderPriorityEnum,
  ReminderType as ReminderTypeEnum,
} from '@repo/database';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { BulkIdsDto } from '../../../common/bulk/bulk-ids.dto';

export class BulkChangeCandidateStatusDto extends BulkIdsDto {
  @IsEnum(CandidateStatus)
  status!: CandidateStatus;

  /** Free-form context recorded as a system note on each candidate. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class BulkAddCandidateNoteDto extends BulkIdsDto {
  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsEnum(NoteType)
  noteType?: NoteType;
}

export class BulkDeleteCandidatesDto extends BulkIdsDto {}

export class BulkAddCandidateReminderDto extends BulkIdsDto {
  @IsEnum(ReminderTypeEnum)
  type!: ReminderTypeEnum;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(ReminderPriorityEnum)
  priority?: ReminderPriorityEnum;

  @IsOptional()
  @IsString()
  dueAt?: string;
}
