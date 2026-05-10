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
} from 'class-validator';

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

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

  @IsOptional()
  @IsEnum(JobPriority)
  hiringPriority?: JobPriority;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  salaryCurrency?: string;

  @IsOptional()
  @IsEnum(SalaryType)
  salaryType?: SalaryType;

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

  @IsOptional()
  @IsDateString()
  targetHireDate?: string;
}
