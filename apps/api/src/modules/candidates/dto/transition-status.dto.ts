import { CandidateStatus } from '@repo/database';
import { IsEnum } from 'class-validator';

export class TransitionCandidateStatusDto {
  @IsEnum(CandidateStatus)
  status: CandidateStatus;
}
