import { SubmissionStatus } from '@repo/database';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum SubmissionSortField {
  CREATED_AT   = 'createdAt',
  UPDATED_AT   = 'updatedAt',
  SUBMITTED_AT = 'submittedAt',
  STATUS       = 'status',
}

export class ListSubmissionsDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsArray()
  @IsEnum(SubmissionStatus, { each: true })
  status?: SubmissionStatus[];

  @IsOptional()
  @IsUUID('4')
  candidateId?: string;

  @IsOptional()
  @IsUUID('4')
  jobId?: string;

  @IsOptional()
  @IsUUID('4')
  vendorId?: string;

  @IsOptional()
  @IsUUID('4')
  ownerId?: string;

  @IsOptional()
  @IsEnum(SubmissionSortField)
  sortBy?: SubmissionSortField;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
