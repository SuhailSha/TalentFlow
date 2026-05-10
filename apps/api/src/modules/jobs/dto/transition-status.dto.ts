import { JobStatus } from '@repo/database';
import { IsEnum } from 'class-validator';

export class TransitionStatusDto {
  @IsEnum(JobStatus)
  status: JobStatus;
}
