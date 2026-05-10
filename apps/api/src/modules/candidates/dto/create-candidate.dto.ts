import { AvailabilityStatus, CandidateSource, CandidateStatus } from '@repo/database';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateCandidateDto {
  // ── Contact ────────────────────────────────────────────────────────────────
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  linkedinUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  githubUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  portfolioUrl?: string;

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

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  // ── Professional ───────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentCompany?: string;

  @IsOptional()
  @IsDateString()
  careerStartDate?: string; // ISO date string "YYYY-MM-DD"

  @IsOptional()
  @IsString()
  summary?: string;

  // ── Compensation ───────────────────────────────────────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryExpectationMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ValidateIf((o) => o.salaryExpectationMin !== undefined && o.salaryExpectationMax !== undefined)
  @ValidateIf((o) => o.salaryExpectationMax >= o.salaryExpectationMin, { message: 'salaryExpectationMax must be >= salaryExpectationMin' })
  salaryExpectationMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  salaryCurrency?: string;

  // ── Status ─────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  // ── Source ─────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(CandidateSource)
  source?: CandidateSource;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceDetail?: string;
}
