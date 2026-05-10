import { VendorStatus } from '@repo/database';
import { IsEnum } from 'class-validator';

export class TransitionVendorStatusDto {
  @IsEnum(VendorStatus)
  status: VendorStatus;
}
