import { ResumeSource, ResumeStatus } from '@repo/database';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListResumesDto {
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsUUID()
  intakeBatchId?: string;

  @IsOptional()
  @IsEnum(ResumeStatus)
  status?: ResumeStatus;

  @IsOptional()
  @IsEnum(ResumeSource)
  source?: ResumeSource;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
