import { EmploymentType, JobPriority, SalaryType, WorkMode } from '@repo/database';
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
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateJobDto {
  // ── Classification ─────────────────────────────────────────────────────────
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  // ── Priority ───────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(JobPriority)
  hiringPriority?: JobPriority;

  // ── Hiring context ─────────────────────────────────────────────────────────
  @IsOptional()
  @IsUUID('4')
  hiringManagerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  hiringManagerName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  openPositions?: number;

  // ── Experience ─────────────────────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experienceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ValidateIf((o) => o.experienceMin !== undefined && o.experienceMax !== undefined)
  @ValidateIf((o) => o.experienceMax >= o.experienceMin, { message: 'experienceMax must be >= experienceMin' })
  experienceMax?: number;

  // ── Compensation ───────────────────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ValidateIf((o) => o.salaryMin !== undefined && o.salaryMax !== undefined)
  @ValidateIf((o) => o.salaryMax >= o.salaryMin, { message: 'salaryMax must be >= salaryMin' })
  salaryMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  salaryCurrency?: string;

  @IsOptional()
  @IsEnum(SalaryType)
  salaryType?: SalaryType;

  // ── Location ───────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  stateProvince?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  // ── Content ────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  niceToHave?: string;

  @IsOptional()
  @IsString()
  benefits?: string;

  // ── Timeline ───────────────────────────────────────────────────────────────
  @IsOptional()
  @IsDateString()
  targetHireDate?: string;
}
