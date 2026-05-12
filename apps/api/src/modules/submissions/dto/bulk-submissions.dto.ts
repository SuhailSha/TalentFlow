import { SubmissionStatus } from '@repo/database';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { BulkIdsDto } from '../../../common/bulk/bulk-ids.dto';
import {
  ReminderPriority as ReminderPriorityEnum,
  ReminderType as ReminderTypeEnum,
} from '@repo/database';

export class BulkChangeStatusDto extends BulkIdsDto {
  @IsEnum(SubmissionStatus)
  status!: SubmissionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class BulkAssignOwnerDto extends BulkIdsDto {
  @IsUUID('4')
  ownerId!: string;
}

export class BulkArchiveDto extends BulkIdsDto {}

export class BulkAddReminderDto extends BulkIdsDto {
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

  /**
   * ISO 8601 timestamp. Validated as string here; the bulk service parses
   * it once and passes a Date to each reminder.create call.
   */
  @IsOptional()
  @IsString()
  dueAt?: string;
}
