import { EmploymentType, JobPriority, JobStatus, WorkMode } from '@repo/database';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum JobSortField {
  TITLE = 'title',
  CREATED_AT = 'createdAt',
  TARGET_HIRE_DATE = 'targetHireDate',
  PRIORITY = 'hiringPriority',
}

export class ListJobsDto extends PaginationDto {
  // ── Full-text search ───────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  search?: string;

  // ── Status filter ──────────────────────────────────────────────────────────
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(JobStatus, { each: true })
  status?: JobStatus[];

  // ── Priority filter ────────────────────────────────────────────────────────
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(JobPriority, { each: true })
  hiringPriority?: JobPriority[];

  // ── Type/mode filters ──────────────────────────────────────────────────────
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(EmploymentType, { each: true })
  employmentType?: EmploymentType[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(WorkMode, { each: true })
  workMode?: WorkMode[];

  // ── Department / location ──────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  country?: string;

  // ── Hiring manager filter ──────────────────────────────────────────────────
  @IsOptional()
  @IsUUID('4')
  hiringManagerId?: string;

  // ── Experience range ───────────────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experienceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experienceMax?: number;

  // ── Sorting ────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(JobSortField)
  sortBy?: JobSortField = JobSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
