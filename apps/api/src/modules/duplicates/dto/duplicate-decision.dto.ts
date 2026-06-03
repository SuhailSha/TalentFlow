import { DuplicateConfidenceTier, DuplicateMatchStatus } from '@repo/database';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, Max } from 'class-validator';

export class MarkNotDuplicateDto {
  @IsString()
  @MaxLength(2000)
  reason: string;
}

export class DeferMatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ListMatchesDto {
  @IsOptional()
  @IsEnum(DuplicateMatchStatus)
  status?: DuplicateMatchStatus;

  @IsOptional()
  @IsEnum(DuplicateConfidenceTier)
  tier?: DuplicateConfidenceTier;

  @IsOptional()
  @IsUUID()
  sourceCandidateId?: string;

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
