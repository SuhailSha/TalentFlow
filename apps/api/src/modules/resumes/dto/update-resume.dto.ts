import { ResumeStatus } from '@repo/database';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateResumeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  /** Limited to non-terminal transitions in R1: ACTIVE ↔ ARCHIVED. */
  @IsOptional()
  @IsEnum(ResumeStatus)
  status?: ResumeStatus;
}
