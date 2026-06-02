import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateIntakeBatchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  label: string;

  @IsOptional()
  @IsUUID()
  sourceVendorId?: string;
}
