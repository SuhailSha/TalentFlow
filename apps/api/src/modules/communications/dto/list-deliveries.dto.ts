import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmailDeliveryStatus } from '@repo/database';

import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * List-email-deliveries query DTO.
 *
 * Replaces the manual parseInt pagination (audit finding S-5). String filters
 * are length-bounded so an attacker cannot pass megabyte-long values and
 * force expensive index scans.
 */
export class ListDeliveriesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(EmailDeliveryStatus)
  status?: EmailDeliveryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  template?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  resourceType?: string;
}
