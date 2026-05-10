import { VendorPriority, VendorStatus, VendorType } from '@repo/database';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum VendorSortField {
  COMPANY_NAME  = 'companyName',
  CREATED_AT    = 'createdAt',
  LAST_ACTIVITY = 'lastActivity',
  PRIORITY      = 'priority',
}

export class ListVendorsDto extends PaginationDto {
  // ── Search ────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  // ── Filters ───────────────────────────────────────────────────────────────
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsArray()
  @IsEnum(VendorStatus, { each: true })
  status?: VendorStatus[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsArray()
  @IsEnum(VendorType, { each: true })
  type?: VendorType[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsArray()
  @IsEnum(VendorPriority, { each: true })
  priority?: VendorPriority[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  domain?: string;

  @IsOptional()
  @IsUUID('4')
  relationshipOwnerId?: string;

  // ── Sorting ───────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(VendorSortField)
  sortBy?: VendorSortField;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
