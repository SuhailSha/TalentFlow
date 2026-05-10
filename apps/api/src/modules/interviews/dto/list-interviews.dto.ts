import { InterviewStatus, InterviewType } from '@repo/database';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum InterviewSortField {
  CREATED_AT   = 'createdAt',
  UPDATED_AT   = 'updatedAt',
  SCHEDULED_AT = 'scheduledAt',
  STATUS       = 'status',
  ROUND        = 'round',
}

export class ListInterviewsDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsArray()
  @IsEnum(InterviewStatus, { each: true })
  status?: InterviewStatus[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsArray()
  @IsEnum(InterviewType, { each: true })
  type?: InterviewType[];

  @IsOptional()
  @IsUUID('4')
  submissionId?: string;

  @IsOptional()
  @IsUUID('4')
  candidateId?: string;

  @IsOptional()
  @IsUUID('4')
  jobId?: string;

  @IsOptional()
  @IsUUID('4')
  ownerId?: string;

  @IsOptional()
  @IsEnum(InterviewSortField)
  sortBy?: InterviewSortField;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
