import { NoteType } from '@repo/database';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSubmissionDto {
  @IsUUID('4')
  candidateId: string;

  @IsUUID('4')
  jobId: string;

  @IsOptional()
  @IsUUID('4')
  vendorId?: string;

  // Defaults to the requesting user; can be set to another recruiter for handoff.
  @IsOptional()
  @IsUUID('4')
  ownerId?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  billRate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  payRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  offerSalary?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  coverNote?: string;
}

export class CreateSubmissionNoteDto {
  @IsString()
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsEnum(NoteType)
  noteType?: NoteType;
}
