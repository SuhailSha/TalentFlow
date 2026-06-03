import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID,
  MaxLength, Min, ValidateNested,
} from 'class-validator';

export class CandidateActionDto {
  @IsEnum(['CREATE', 'UPDATE'])
  kind: 'CREATE' | 'UPDATE';

  @IsOptional()
  @IsUUID()
  existingCandidateId?: string;

  @IsOptional()
  @IsEnum(['PREFER_RESUME', 'PREFER_EXISTING', 'MANUAL'])
  fieldStrategy?: 'PREFER_RESUME' | 'PREFER_EXISTING' | 'MANUAL';
}

export class ReviewDecisionDto {
  @IsOptional()
  @IsObject()
  acceptedFields?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  editedFields?: Record<string, { extracted?: unknown; edited: unknown; reason?: string }>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rejectedFields?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CandidateActionDto)
  candidateAction?: CandidateActionDto;

  @IsOptional()
  @IsEnum(['ATTACH_AS_CURRENT', 'ATTACH_AS_VARIANT', 'DISCARD'])
  resumeLinkAction?: 'ATTACH_AS_CURRENT' | 'ATTACH_AS_VARIANT' | 'DISCARD';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class SaveDraftDto {
  @ValidateNested()
  @Type(() => ReviewDecisionDto)
  decision: ReviewDecisionDto;

  /** Optimistic-concurrency token; must match the server's ReviewTask.draftVersion. */
  @IsInt()
  @Min(0)
  baseVersion: number;
}

export class ApproveReviewDto {
  @ValidateNested()
  @Type(() => ReviewDecisionDto)
  decision: ReviewDecisionDto;

  /**
   * When true, skip the duplicate-detection gate and proceed with promotion.
   * Powers the "Continue Promotion" action on the duplicate review workspace.
   * The recruiter has seen the matches and explicitly chosen to proceed.
   */
  @IsOptional()
  @IsBoolean()
  acknowledgeDuplicates?: boolean;
}

export class RejectReviewDto {
  @IsString()
  @MaxLength(2000)
  reason: string;
}
