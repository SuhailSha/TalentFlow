import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { BulkIdsDto } from '../../../common/bulk/bulk-ids.dto';

export class BulkSnoozeRemindersDto extends BulkIdsDto {
  /** Duration in minutes; matches SnoozeReminderDto.minutes constraints. */
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(43_200) // 30 days
  minutes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class BulkCompleteRemindersDto extends BulkIdsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class BulkDismissRemindersDto extends BulkIdsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
