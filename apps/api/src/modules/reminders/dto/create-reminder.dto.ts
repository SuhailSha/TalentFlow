import { ReminderPriority, ReminderType } from '@repo/database';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateReminderDto {
  @IsEnum(ReminderType)
  type: ReminderType;

  @IsOptional()
  @IsEnum(ReminderPriority)
  priority?: ReminderPriority;

  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  // Optional workflow links
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @IsOptional()
  @IsUUID()
  interviewId?: string;

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsUUID()
  jobId?: string;

  // Who to assign to (defaults to current user if omitted)
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
