import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SnoozeReminderDto {
  /** Duration in minutes to snooze (e.g. 60 = 1 h, 1440 = 1 day, 10080 = 1 week). */
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(43200) // max 30 days
  minutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
