import { FeedbackRecommendation } from '@repo/database';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFeedbackDto {
  @IsOptional()
  @IsEnum(FeedbackRecommendation)
  recommendation?: FeedbackRecommendation;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  technicalScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  communicationScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  cultureFitScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  overallScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  strengths?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  concerns?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;
}

export class UpdateFeedbackDto extends CreateFeedbackDto {}

export class SubmitFeedbackDto extends CreateFeedbackDto {}
