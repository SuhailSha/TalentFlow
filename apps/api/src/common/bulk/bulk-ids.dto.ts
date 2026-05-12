import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

import { BULK_MAX_IDS } from './bulk.types';

/**
 * Base DTO for every bulk endpoint. Concrete DTOs extend this and add
 * action-specific fields (status, ownerId, snoozeUntil, etc.).
 *
 * Validation:
 *   - 1..BULK_MAX_IDS unique UUIDs.
 *
 * Tenant authorization is enforced server-side inside the per-domain
 * bulk service via runBulkOperation's `authorize` callback.
 */
export class BulkIdsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one id is required' })
  @ArrayMaxSize(BULK_MAX_IDS, { message: `No more than ${BULK_MAX_IDS} ids per request` })
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids!: string[];
}
