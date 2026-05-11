import { ReminderPriority, ReminderStatus, ReminderType } from '@repo/database';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export type ReminderSortField = 'dueAt' | 'priority' | 'createdAt' | 'status';

const toArray = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [value];

export class ListRemindersDto extends PaginationDto {
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(ReminderStatus, { each: true })
  status?: ReminderStatus[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(ReminderType, { each: true })
  type?: ReminderType[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(ReminderPriority, { each: true })
  priority?: ReminderPriority[];

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

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
  sortBy?: ReminderSortField;

  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
