import { SubmissionStatus } from '@repo/database';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChangeStatusDto {
  @IsEnum(SubmissionStatus)
  status: SubmissionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
