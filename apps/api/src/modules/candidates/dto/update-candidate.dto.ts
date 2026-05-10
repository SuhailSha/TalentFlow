import { PartialType } from '@nestjs/mapped-types';
import { CreateCandidateDto } from './create-candidate.dto';

/**
 * All fields optional — PATCH semantics.
 * Email can be updated (triggers duplicate-check in service).
 */
export class UpdateCandidateDto extends PartialType(CreateCandidateDto) {}
