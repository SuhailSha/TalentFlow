import { InterviewType, NoteType } from '@repo/database';
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

export class CreateInterviewDto {
  @IsUUID('4')
  submissionId: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  round: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  roundLabel?: string;

  @IsEnum(InterviewType)
  type: InterviewType;

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

export class CreateInterviewNoteDto {
  @IsString()
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsEnum(NoteType)
  noteType?: NoteType;
}
