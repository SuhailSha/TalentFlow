import { AvailabilityStatus, CandidateStatus } from '@repo/database';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum CandidateSortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  LAST_ACTIVITY = 'lastActivityAt',
  EXPERIENCE = 'experience',
}

export class ListCandidatesDto extends PaginationDto {
  // ── Full-text search ───────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  search?: string;

  // ── Status filters ─────────────────────────────────────────────────────────
  // Accepts single value or comma-separated list: status=ACTIVE or status=ACTIVE,PLACED
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(CandidateStatus, { each: true })
  status?: CandidateStatus[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsEnum(AvailabilityStatus, { each: true })
  availabilityStatus?: AvailabilityStatus[];

  // ── Skill filter ──────────────────────────────────────────────────────────
  // Filter to candidates who have ALL of the specified skills.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds?: string[];

  // ── Experience range ──────────────────────────────────────────────────────
  // Converted to careerStartDate bounds in the service layer.
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

  // ── Location filters ──────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  isRemote?: boolean;

  // ── Sorting ───────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(CandidateSortField)
  sortBy?: CandidateSortField = CandidateSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
