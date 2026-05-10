import { InterviewType } from '@repo/database';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateInterviewDto {
  @IsOptional()
  @IsEnum(InterviewType)
  type?: InterviewType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  roundLabel?: string;

  @IsOptional()
  @IsUUID('4')
  ownerId?: string;

  @IsOptional()
  @IsUUID('4')
  interviewerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  interviewerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  interviewerEmail?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  @Type(() => Number)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  briefingNotes?: string;
}
