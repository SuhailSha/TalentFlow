import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

/**
 * Upload-resume DTO. Multipart fields arrive as strings; class-validator
 * verifies them after class-transformer coerces from the form payload.
 *
 * Two upload modes — at most one identifier may be set:
 *   1. candidateId provided     → bind to that candidate
 *   2. firstName/lastName/email → create Candidate(status=DRAFT) + bind
 *
 * label, intakeBatchId are optional in either mode.
 */
export class UploadResumeDto {
  /** Bind to an existing candidate. When set, draft-candidate fields are ignored. */
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  /** Draft-candidate first name. Required when candidateId is absent. */
  @ValidateIf((o: UploadResumeDto) => !o.candidateId)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ValidateIf((o: UploadResumeDto) => !o.candidateId)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ValidateIf((o: UploadResumeDto) => !o.candidateId)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  /** Optional recruiter-supplied tag. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  /** Optional batch grouping. */
  @IsOptional()
  @IsUUID()
  intakeBatchId?: string;
}
