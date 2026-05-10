import { VendorPriority, VendorType } from '@repo/database';
import {
  IsArray,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVendorDto {
  // ── Identity ───────────────────────────────────────────────────────────────
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  companyName: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  website?: string;

  @IsOptional()
  @IsEnum(VendorType)
  type?: VendorType;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEnum(VendorPriority)
  priority?: VendorPriority;

  // ── Location ───────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  stateProvince?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  // ── Relationship ───────────────────────────────────────────────────────────
  @IsOptional()
  @IsUUID('4')
  relationshipOwnerId?: string;

  // ── Business terms ─────────────────────────────────────────────────────────
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  domains?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  contractDetails?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  commissionRate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  paymentTermsDays?: number;

  // ── Initial primary contact (optional convenience — creates a VendorContact) ─
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryContactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryContactPhone?: string;
}
