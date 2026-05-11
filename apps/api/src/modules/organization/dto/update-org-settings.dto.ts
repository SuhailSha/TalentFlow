import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  timeFormat?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  workingDays?: number[];

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  submissionStaleDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workflowStaleDays?: number;

  @IsOptional()
  @IsBoolean()
  requireInterviewFeedback?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppNotificationsEnabled?: boolean;
}
