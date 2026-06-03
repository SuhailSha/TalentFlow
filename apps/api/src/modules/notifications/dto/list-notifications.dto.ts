import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * List-notifications query DTO.
 *
 * Replaces the manual parseInt pagination pattern that bypassed the global
 * ValidationPipe (audit finding S-4). `page` and `limit` inherit class-
 * validator constraints from PaginationDto (page ≥ 1, 1 ≤ limit ≤ 100).
 *
 * `unreadOnly` uses an **explicit** boolean transform — class-transformer's
 * default Boolean() returns true for the string "false", which would
 * silently invert the filter. We accept only the literal strings "true"
 * and "1" as truthy. See auto-memory `feedback_nestjs_boolean_env`.
 */
export class ListNotificationsDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1')
  @IsBoolean()
  unreadOnly?: boolean;
}
