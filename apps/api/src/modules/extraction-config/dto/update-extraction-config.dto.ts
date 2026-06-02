import { ResumeParserProvider } from '@repo/database';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** A recruiter-defined extra field that the org wants extracted. */
export class CustomFieldDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  group: string;

  @IsEnum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN'])
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateExtractionConfigDto {
  @IsOptional()
  @IsEnum(ResumeParserProvider)
  preferredProvider?: ResumeParserProvider;

  @IsOptional()
  @IsEnum(ResumeParserProvider)
  fallbackProvider?: ResumeParserProvider;

  /**
   * Full field allowlist tree: { identity: {...}, professional: {...}, ... }.
   * Replaced wholesale on update (PUT semantics). Validated as an object;
   * deeper shape is enforced by the service layer.
   */
  @IsOptional()
  @IsObject()
  extractFields?: Record<string, Record<string, boolean>>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[];

  @IsOptional()
  @IsObject()
  extractionRules?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  reviewSlaHours?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  claimTtlMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1024 * 1024)
  @Max(50 * 1024 * 1024)
  maxFileBytes?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyParseBudgetUsd?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyParseBudgetCount?: number;
}
