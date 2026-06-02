import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { OrganizationExtractionConfig, Prisma } from '@repo/database';

import type { RequestUser } from '../../auth/types/request-user.interface';
import { EventNames } from '../../common/events/event-names.constant';
import { PrismaService } from '../../database';
import { DEFAULT_EXTRACTION_RULES, DEFAULT_EXTRACT_FIELDS } from './extraction-config.defaults';
import type { UpdateExtractionConfigDto } from './dto/update-extraction-config.dto';

/** Recruiter-defined extra field on OrganizationExtractionConfig.customFields. */
export interface CustomExtractionField {
  id:           string;
  label:        string;
  group:        string;
  type:         'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';
  description?: string;
}

export interface ExtractionConfigView {
  id:                       string;
  organizationId:           string;
  preferredProvider:        string;
  fallbackProvider:         string | null;
  extractFields:            Record<string, Record<string, boolean>>;
  customFields:             unknown[];
  extractionRules:          Record<string, unknown>;
  reviewSlaHours:           number;
  claimTtlMinutes:          number;
  maxFileBytes:             number;
  monthlyParseBudgetUsd:    number | null;
  monthlyParseBudgetCount:  number | null;
  isDefault:                boolean;   // true when no DB row exists yet
  updatedAt:                string;
  updatedBy:                string | null;
}

function toView(row: OrganizationExtractionConfig, isDefault: boolean): ExtractionConfigView {
  return {
    id:                      row.id,
    organizationId:          row.organizationId,
    preferredProvider:       row.preferredProvider,
    fallbackProvider:        row.fallbackProvider,
    extractFields:           row.extractFields as Record<string, Record<string, boolean>>,
    customFields:            row.customFields as unknown[],
    extractionRules:         row.extractionRules as Record<string, unknown>,
    reviewSlaHours:          row.reviewSlaHours,
    claimTtlMinutes:         row.claimTtlMinutes,
    maxFileBytes:            Number(row.maxFileBytes),
    monthlyParseBudgetUsd:   row.monthlyParseBudgetUsd === null ? null : Number(row.monthlyParseBudgetUsd),
    monthlyParseBudgetCount: row.monthlyParseBudgetCount,
    isDefault,
    updatedAt:               row.updatedAt.toISOString(),
    updatedBy:               row.updatedBy,
  };
}

/**
 * Per-org extraction settings.
 *
 * On first read for an org, a row is upserted with platform defaults so the
 * UI always sees a real settings object. On update, fields supplied in the
 * DTO overwrite the row; omitted fields are preserved.
 *
 * `isDefault` is a view-only flag indicating "no recruiter has touched this
 * yet". It flips to false the moment any field is updated.
 */
@Injectable()
export class ExtractionConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Get-or-create with platform defaults. Idempotent. */
  async get(organizationId: string): Promise<ExtractionConfigView> {
    const existing = await this.prisma.organizationExtractionConfig.findUnique({
      where: { organizationId },
    });
    if (existing) return toView(existing, false);

    const created = await this.prisma.organizationExtractionConfig.upsert({
      where:  { organizationId },
      create: {
        organizationId,
        preferredProvider: 'GEMINI_FLASH',
        extractFields:     DEFAULT_EXTRACT_FIELDS as unknown as Prisma.InputJsonValue,
        customFields:      [],
        extractionRules:   DEFAULT_EXTRACTION_RULES as unknown as Prisma.InputJsonValue,
      },
      update: {}, // race-safe: if another request created it, leave alone.
    });
    return toView(created, true);
  }

  /** Read-only platform defaults. Used for "reset to defaults" UX. */
  getDefaults() {
    return {
      preferredProvider: 'GEMINI_FLASH' as const,
      fallbackProvider:  null,
      extractFields:     DEFAULT_EXTRACT_FIELDS,
      customFields:      [],
      extractionRules:   DEFAULT_EXTRACTION_RULES,
      reviewSlaHours:    24,
      claimTtlMinutes:   30,
      maxFileBytes:      10 * 1024 * 1024,
      monthlyParseBudgetUsd:   null,
      monthlyParseBudgetCount: null,
    };
  }

  async update(
    organizationId: string,
    dto: UpdateExtractionConfigDto,
    actor: RequestUser,
  ): Promise<ExtractionConfigView> {
    // Ensure a row exists.
    await this.get(organizationId);

    const data: Prisma.OrganizationExtractionConfigUpdateInput = {
      updatedBy: actor.userId,
    };

    if (dto.preferredProvider !== undefined) data.preferredProvider = dto.preferredProvider;
    if (dto.fallbackProvider  !== undefined) data.fallbackProvider  = dto.fallbackProvider;
    if (dto.extractFields     !== undefined) data.extractFields     = dto.extractFields as unknown as Prisma.InputJsonValue;
    if (dto.customFields      !== undefined) data.customFields      = dto.customFields  as unknown as Prisma.InputJsonValue;
    if (dto.extractionRules   !== undefined) data.extractionRules   = dto.extractionRules as unknown as Prisma.InputJsonValue;
    if (dto.reviewSlaHours    !== undefined) data.reviewSlaHours    = dto.reviewSlaHours;
    if (dto.claimTtlMinutes   !== undefined) data.claimTtlMinutes   = dto.claimTtlMinutes;
    if (dto.maxFileBytes      !== undefined) data.maxFileBytes      = BigInt(dto.maxFileBytes);
    if (dto.monthlyParseBudgetUsd   !== undefined) data.monthlyParseBudgetUsd   = dto.monthlyParseBudgetUsd;
    if (dto.monthlyParseBudgetCount !== undefined) data.monthlyParseBudgetCount = dto.monthlyParseBudgetCount;

    const updated = await this.prisma.organizationExtractionConfig.update({
      where: { organizationId },
      data,
    });

    this.events.emit(EventNames.ORG_SETTINGS_UPDATED, {
      organizationId,
      actorId: actor.userId,
      scope:   'extraction_config',
    });

    return toView(updated, false);
  }
}
