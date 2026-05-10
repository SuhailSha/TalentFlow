import { PartialType } from '@nestjs/mapped-types';

import { CreateVendorContactDto } from './create-vendor-contact.dto';

export class UpdateVendorContactDto extends PartialType(CreateVendorContactDto) {}
