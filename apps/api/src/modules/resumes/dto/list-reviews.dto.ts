import { ReviewPriority, ReviewTaskStatus } from '@repo/database';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListReviewsDto {
  @IsOptional()
  @IsEnum(ReviewTaskStatus)
  status?: ReviewTaskStatus;

  @IsOptional()
  @IsEnum(ReviewPriority)
  priority?: ReviewPriority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  /** "mine" → assigneeId = currentUser.id. Overrides any `assigneeId` query. */
  @IsOptional()
  mineOnly?: 'true' | 'false';

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
