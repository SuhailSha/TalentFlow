import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/database';

import { PrismaService } from '../../database';
import { toSkip } from '../../common/helpers/response.helper';
import { buildPrefixTsQuery } from '../../common/search/prefix-tsquery';
import type { ListVendorsDto, VendorSortField } from './dto/list-vendors.dto';
import { VENDOR_DETAIL_INCLUDE } from './types/vendor.types';

// ── Include constants ──────────────────────────────────────────────────────────

// List view: no relations needed — all display fields are on the vendor row
const VENDOR_LIST_INCLUDE = {} satisfies Prisma.VendorInclude;

// ── Repository ────────────────────────────────────────────────────────────────

@Injectable()
export class VendorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Count ─────────────────────────────────────────────────────────────────

  async countForOrg(organizationId: string): Promise<number> {
    return this.prisma.vendor.count({
      where: { organizationId, deletedAt: null },
    });
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findMany(
    organizationId: string,
    dto: ListVendorsDto,
  ): Promise<{ vendors: Prisma.VendorGetPayload<Record<string, never>>[]; total: number }> {
    const offset = toSkip(dto.page ?? 1, dto.limit ?? 20);
    const limit  = dto.limit ?? 20;

    if (dto.search?.trim()) {
      return this.findManyFts(organizationId, dto, offset, limit);
    }
    return this.findManyPrisma(organizationId, dto, offset, limit);
  }

  /**
   * Hybrid search — see CandidatesRepository.findManyWithFts for the design
   * notes. Vendors uses the `english` tsvector config and OR-combines with
   * trigram `%` on the indexed name/contact fields.
   */
  private async findManyFts(
    organizationId: string,
    dto: ListVendorsDto,
    offset: number,
    limit: number,
  ): Promise<{ vendors: Prisma.VendorGetPayload<Record<string, never>>[]; total: number }> {
    const raw    = dto.search!.trim();
    const cooked = buildPrefixTsQuery(raw);

    if (!cooked) {
      return this.findManyPrisma(organizationId, { ...dto, search: undefined }, offset, limit);
    }

    const [countResult, rawResults] = await Promise.all([
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM vendors,
             to_tsquery('english', ${cooked}) q
        WHERE organization_id = ${organizationId}::uuid
          AND deleted_at IS NULL
          AND (
            search_vector @@ q
            OR company_name          % ${raw}
            OR primary_contact_name  % ${raw}
            OR primary_contact_email % ${raw}
            OR vendor_code           % ${raw}
          )
      `,
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM vendors,
             to_tsquery('english', ${cooked}) q
        WHERE organization_id = ${organizationId}::uuid
          AND deleted_at IS NULL
          AND (
            search_vector @@ q
            OR company_name          % ${raw}
            OR primary_contact_name  % ${raw}
            OR primary_contact_email % ${raw}
            OR vendor_code           % ${raw}
          )
        ORDER BY
          ts_rank(search_vector, q) * 10
            + GREATEST(
                similarity(coalesce(company_name,          ''), ${raw}),
                similarity(coalesce(primary_contact_name,  ''), ${raw}),
                similarity(coalesce(primary_contact_email, ''), ${raw}),
                similarity(coalesce(vendor_code,           ''), ${raw})
              ) DESC,
          created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    if (rawResults.length === 0) return { vendors: [], total };

    const ids = rawResults.map((r) => r.id);
    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: ids } },
      include: VENDOR_LIST_INCLUDE,
    });

    const orderedVendors = ids
      .map((id) => vendors.find((v) => v.id === id))
      .filter((v): v is NonNullable<typeof v> => v !== undefined);

    return { vendors: orderedVendors, total };
  }

  private async findManyPrisma(
    organizationId: string,
    dto: ListVendorsDto,
    offset: number,
    limit: number,
  ): Promise<{ vendors: Prisma.VendorGetPayload<Record<string, never>>[]; total: number }> {
    const where = this.buildWhere(organizationId, dto);
    const orderBy = this.buildOrderBy(dto);

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({ where, orderBy, skip: offset, take: limit }),
      this.prisma.vendor.count({ where }),
    ]);

    return { vendors, total };
  }

  private buildWhere(
    organizationId: string,
    dto: ListVendorsDto,
  ): Prisma.VendorWhereInput {
    const where: Prisma.VendorWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (dto.status?.length)   where.status   = { in: dto.status };
    if (dto.type?.length)     where.type     = { in: dto.type };
    if (dto.priority?.length) where.priority = { in: dto.priority };
    if (dto.country)          where.country  = { equals: dto.country, mode: 'insensitive' };
    if (dto.domain)           where.domains  = { hasSome: [dto.domain] };
    if (dto.relationshipOwnerId) where.relationshipOwnerId = dto.relationshipOwnerId;

    return where;
  }

  private buildOrderBy(dto: ListVendorsDto): Prisma.VendorOrderByWithRelationInput {
    const dir = dto.sortOrder ?? 'desc';
    const field: VendorSortField | undefined = dto.sortBy;

    if (field === 'companyName')  return { companyName: dir };
    if (field === 'priority')     return { priority: dir };
    if (field === 'lastActivity') return { lastActivityAt: dir };
    return { createdAt: dir };
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findById(id: string, organizationId: string) {
    return this.prisma.vendor.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: VENDOR_DETAIL_INCLUDE,
    });
  }

  async findByIdRaw(id: string, organizationId: string) {
    return this.prisma.vendor.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }

  // ── Duplicate detection ───────────────────────────────────────────────────

  /** Level-1: case-insensitive company name match per org (soft-delete aware). */
  async findByCompanyName(name: string, organizationId: string, excludeId?: string) {
    return this.prisma.vendor.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        companyName: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  /** Level-2: website URL match (non-blocking — returned as warning). */
  async findByWebsite(website: string, organizationId: string, excludeId?: string) {
    return this.prisma.vendor.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        website: { equals: website, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, companyName: true, status: true },
    });
  }

  /** Level-3: primary email match across vendors (non-blocking — warning). */
  async findByPrimaryEmail(email: string, organizationId: string, excludeId?: string) {
    return this.prisma.vendor.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        primaryContactEmail: { equals: email, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, companyName: true, primaryContactEmail: true, status: true },
    });
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(data: Prisma.VendorUncheckedCreateInput) {
    return this.prisma.vendor.create({
      data,
      include: VENDOR_DETAIL_INCLUDE,
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(
    id: string,
    organizationId: string,
    data: Prisma.VendorUncheckedUpdateInput,
  ) {
    return this.prisma.vendor.update({
      where: { id, organizationId, deletedAt: null },
      data: { ...data, updatedAt: new Date() },
      include: VENDOR_DETAIL_INCLUDE,
    });
  }

  async softDelete(id: string, organizationId: string, deletedBy: string) {
    return this.prisma.vendor.update({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date(), deletedBy },
    });
  }

  async touchActivityAt(id: string, organizationId: string) {
    return this.prisma.vendor.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { lastActivityAt: new Date() },
    });
  }

  // ── Contacts ──────────────────────────────────────────────────────────────

  async findContacts(vendorId: string) {
    return this.prisma.vendorContact.findMany({
      where: { vendorId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findContact(contactId: string, vendorId: string) {
    return this.prisma.vendorContact.findFirst({
      where: { id: contactId, vendorId },
    });
  }

  async createContact(data: Prisma.VendorContactUncheckedCreateInput) {
    return this.prisma.vendorContact.create({ data });
  }

  async updateContact(
    contactId: string,
    data: Prisma.VendorContactUncheckedUpdateInput,
  ) {
    return this.prisma.vendorContact.update({
      where: { id: contactId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteContact(contactId: string) {
    return this.prisma.vendorContact.delete({ where: { id: contactId } });
  }

  /** Demote all contacts for a vendor to non-primary (before setting a new primary). */
  async demoteAllContacts(vendorId: string) {
    return this.prisma.vendorContact.updateMany({
      where: { vendorId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  async createNote(data: Prisma.VendorNoteUncheckedCreateInput) {
    return this.prisma.vendorNote.create({ data });
  }

  async findNotes(vendorId: string, organizationId: string) {
    return this.prisma.vendorNote.findMany({
      where: { vendorId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
