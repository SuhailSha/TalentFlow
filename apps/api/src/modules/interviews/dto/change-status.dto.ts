import { InterviewStatus } from '@repo/database';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChangeInterviewStatusDto {
  @IsEnum(InterviewStatus)
  status: InterviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
