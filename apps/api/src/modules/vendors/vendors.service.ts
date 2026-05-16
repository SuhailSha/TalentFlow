import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NoteType, VendorStatus } from '@repo/database';

import type { RequestUser } from '../../auth/types/request-user.interface';
import { AppContextService } from '../../common/context/app-context.service';
import { EventNames } from '../../common/events/event-names.constant';
import { FsmService, VENDOR_FSM } from '../../common/workflow';
import { PrismaService } from '../../database/prisma.service';
import { VendorsRepository } from './vendors.repository';
import type { CreateVendorContactDto } from './dto/create-vendor-contact.dto';
import type { CreateVendorDto } from './dto/create-vendor.dto';
import type { CreateVendorNoteDto } from './dto/create-vendor-note.dto';
import type { ListVendorsDto } from './dto/list-vendors.dto';
import type { TransitionVendorStatusDto } from './dto/transition-vendor-status.dto';
import type { UpdateVendorContactDto } from './dto/update-vendor-contact.dto';
import type { UpdateVendorDto } from './dto/update-vendor.dto';
import {
  toVendorDetail,
  toVendorListItem,
  type PotentialDuplicateVendor,
  type VendorDetail,
  type VendorListItem,
} from './types/vendor.types';
import {
  VendorContactAddedEvent,
  VendorContactRemovedEvent,
  VendorContactUpdatedEvent,
  VendorCreatedEvent,
  VendorDeletedEvent,
  VendorNoteAddedEvent,
  VendorStatusChangedEvent,
  VendorUpdatedEvent,
} from './events/vendor.events';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private readonly repo: VendorsRepository,
    private readonly events: EventEmitter2,
    private readonly ctx: AppContextService,
    private readonly fsm: FsmService,
    private readonly db: PrismaService,
  ) {}

  private actorContext(actor: RequestUser) {
    return {
      actorId: actor.userId,
      actorEmail: actor.email,
      organizationId: actor.organizationId,
      correlationId: this.ctx.requestId,
    };
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findMany(
    organizationId: string,
    dto: ListVendorsDto,
  ): Promise<{ vendors: VendorListItem[]; total: number }> {
    const { vendors, total } = await this.repo.findMany(organizationId, dto);
    if (vendors.length === 0) return { vendors: [], total };

    // Enrich with operational counts in two parallel grouped queries —
    // one round-trip per signal. Cheap on a page-sized vendor batch.
    const ids = vendors.map((v) => v.id);
    const stalledCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ACTIVE = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'ON_HOLD'] as const;

    const [activeCounts, stalledCounts] = await Promise.all([
      this.db.submission.groupBy({
        by: ['vendorId'],
        where: {
          organizationId,
          deletedAt: null,
          vendorId: { in: ids },
          status: { in: [...ACTIVE] },
        },
        _count: { _all: true },
      }),
      this.db.submission.groupBy({
        by: ['vendorId'],
        where: {
          organizationId,
          deletedAt: null,
          vendorId: { in: ids },
          status: { in: [...ACTIVE] },
          updatedAt: { lt: stalledCutoff },
        },
        _count: { _all: true },
      }),
    ]);

    const activeByVendor  = new Map(activeCounts .map((g) => [g.vendorId, g._count._all]));
    const stalledByVendor = new Map(stalledCounts.map((g) => [g.vendorId, g._count._all]));

    const items = vendors.map((v) => ({
      ...toVendorListItem(v),
      activeSubmissionCount:  activeByVendor.get(v.id)  ?? 0,
      stalledSubmissionCount: stalledByVendor.get(v.id) ?? 0,
    }));
    return { vendors: items, total };
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findById(id: string, organizationId: string): Promise<VendorDetail> {
    const vendor = await this.repo.findById(id, organizationId);
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return toVendorDetail(vendor);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(
    dto: CreateVendorDto,
    actor: RequestUser,
  ): Promise<{ vendor: VendorDetail; potentialDuplicates: PotentialDuplicateVendor[] }> {
    const { organizationId } = actor;
    const companyName = dto.companyName.trim();

    // Level-1: hard duplicate check (case-insensitive name per org)
    const existing = await this.repo.findByCompanyName(companyName, organizationId);
    if (existing) {
      throw new ConflictException({
        message: `A vendor named "${companyName}" already exists in this organization.`,
        code: 'DUPLICATE_VENDOR_NAME',
        duplicateVendorId: existing.id,
      });
    }

    // Level-2/3: soft duplicate warnings (non-blocking)
    const potentialDuplicates: PotentialDuplicateVendor[] = [];

    if (dto.website) {
      const byWebsite = await this.repo.findByWebsite(dto.website, organizationId);
      if (byWebsite) {
        potentialDuplicates.push({
          id: byWebsite.id,
          companyName: byWebsite.companyName,
          website: dto.website,
          primaryContactEmail: null,
          status: byWebsite.status,
        });
      }
    }

    if (dto.primaryContactEmail) {
      const byEmail = await this.repo.findByPrimaryEmail(dto.primaryContactEmail, organizationId);
      if (byEmail) {
        potentialDuplicates.push({
          id: byEmail.id,
          companyName: byEmail.companyName,
          website: null,
          primaryContactEmail: byEmail.primaryContactEmail ?? null,
          status: byEmail.status,
        });
      }
    }

    // Generate org-scoped vendor code: VND-0001, VND-0002, …
    const count = await this.repo.countForOrg(organizationId);
    const vendorCode = `VND-${String(count + 1).padStart(4, '0')}`;

    const vendor = await this.repo.create({
      organizationId,
      vendorCode,
      companyName,
      website: dto.website ?? null,
      type: dto.type ?? 'STAFFING_AGENCY',
      status: 'PROSPECT',
      priority: dto.priority ?? 'NORMAL',
      city: dto.city?.trim() ?? null,
      stateProvince: dto.stateProvince?.trim() ?? null,
      country: dto.country?.trim() ?? null,
      timezone: dto.timezone ?? null,
      primaryContactName: dto.primaryContactName?.trim() ?? null,
      primaryContactEmail: dto.primaryContactEmail?.trim() ?? null,
      primaryContactPhone: dto.primaryContactPhone?.trim() ?? null,
      relationshipOwnerId: dto.relationshipOwnerId ?? null,
      domains: dto.domains ?? [],
      description: dto.description?.trim() ?? null,
      contractDetails: dto.contractDetails?.trim() ?? null,
      commissionRate: dto.commissionRate ?? null,
      paymentTermsDays: dto.paymentTermsDays ?? null,
      lastActivityAt: new Date(),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    // If inline primary contact provided, create a VendorContact record
    if (dto.primaryContactName && dto.primaryContactEmail) {
      const [firstName, ...rest] = dto.primaryContactName.split(' ');
      await this.repo.createContact({
        vendorId: vendor.id,
        organizationId,
        firstName: firstName ?? dto.primaryContactName,
        lastName: rest.join(' ') || '—',
        email: dto.primaryContactEmail,
        phone: dto.primaryContactPhone ?? null,
        isPrimary: true,
        isActive: true,
        createdBy: actor.userId,
      });
    }

    this.logger.log({ msg: 'Vendor created', vendorId: vendor.id, vendorCode, orgId: organizationId });

    this.events.emit(
      EventNames.VENDOR_CREATED,
      new VendorCreatedEvent(this.actorContext(actor), {
        vendorId: vendor.id,
        vendorCode,
        companyName,
      }),
    );

    // Re-fetch with contacts included
    const fresh = await this.repo.findById(vendor.id, organizationId);
    return { vendor: toVendorDetail(fresh!), potentialDuplicates };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateVendorDto, actor: RequestUser): Promise<VendorDetail> {
    const { organizationId } = actor;
    await this.assertExists(id, organizationId);

    // Name uniqueness check if companyName is changing
    if (dto.companyName) {
      const nameConflict = await this.repo.findByCompanyName(
        dto.companyName.trim(),
        organizationId,
        id,
      );
      if (nameConflict) {
        throw new ConflictException({
          message: `A vendor named "${dto.companyName.trim()}" already exists.`,
          code: 'DUPLICATE_VENDOR_NAME',
          duplicateVendorId: nameConflict.id,
        });
      }
    }

    const updated = await this.repo.update(id, organizationId, {
      ...(dto.companyName     ? { companyName: dto.companyName.trim() } : {}),
      ...(dto.website !== undefined ? { website: dto.website ?? null } : {}),
      ...(dto.type            ? { type: dto.type } : {}),
      ...(dto.priority        ? { priority: dto.priority } : {}),
      ...(dto.city !== undefined ? { city: dto.city?.trim() ?? null } : {}),
      ...(dto.stateProvince !== undefined ? { stateProvince: dto.stateProvince?.trim() ?? null } : {}),
      ...(dto.country !== undefined ? { country: dto.country?.trim() ?? null } : {}),
      ...(dto.timezone !== undefined ? { timezone: dto.timezone ?? null } : {}),
      ...(dto.primaryContactName  !== undefined ? { primaryContactName:  dto.primaryContactName?.trim()  ?? null } : {}),
      ...(dto.primaryContactEmail !== undefined ? { primaryContactEmail: dto.primaryContactEmail?.trim() ?? null } : {}),
      ...(dto.primaryContactPhone !== undefined ? { primaryContactPhone: dto.primaryContactPhone?.trim() ?? null } : {}),
      ...(dto.relationshipOwnerId !== undefined ? { relationshipOwnerId: dto.relationshipOwnerId ?? null } : {}),
      ...(dto.domains         !== undefined ? { domains: dto.domains ?? [] } : {}),
      ...(dto.description     !== undefined ? { description: dto.description?.trim() ?? null } : {}),
      ...(dto.contractDetails !== undefined ? { contractDetails: dto.contractDetails?.trim() ?? null } : {}),
      ...(dto.commissionRate  !== undefined ? { commissionRate: dto.commissionRate ?? null } : {}),
      ...(dto.paymentTermsDays !== undefined ? { paymentTermsDays: dto.paymentTermsDays ?? null } : {}),
      updatedBy: actor.userId,
    });

    this.events.emit(
      EventNames.VENDOR_UPDATED,
      new VendorUpdatedEvent(this.actorContext(actor), {
        vendorId: id,
        changedFields: Object.keys(dto),
      }),
    );

    return toVendorDetail(updated);
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  async softDelete(id: string, actor: RequestUser): Promise<void> {
    await this.assertExists(id, actor.organizationId);
    await this.repo.softDelete(id, actor.organizationId, actor.userId);
    this.logger.log({ msg: 'Vendor soft-deleted', vendorId: id, actorId: actor.userId });
    this.events.emit(
      EventNames.VENDOR_DELETED,
      new VendorDeletedEvent(this.actorContext(actor), { vendorId: id }),
    );
  }

  // ── Status transition ─────────────────────────────────────────────────────

  async transitionStatus(
    id: string,
    dto: TransitionVendorStatusDto,
    actor: RequestUser,
  ): Promise<VendorDetail> {
    const vendor = await this.assertExists(id, actor.organizationId);
    const fromStatus = vendor.status;
    const toStatus   = dto.status;

    this.fsm.validate(VENDOR_FSM, fromStatus, toStatus);

    const now = new Date();
    const updated = await this.repo.update(id, actor.organizationId, {
      status: toStatus,
      ...(toStatus === VendorStatus.ACTIVE && !vendor.activatedAt ? { activatedAt: now } : {}),
      ...(toStatus === VendorStatus.ARCHIVED ? { deletedAt: now, deletedBy: actor.userId } : {}),
      updatedBy: actor.userId,
    });

    this.logger.log({ msg: 'Vendor status changed', vendorId: id, fromStatus, toStatus });

    this.events.emit(
      EventNames.VENDOR_STATUS_CHANGED,
      new VendorStatusChangedEvent(this.actorContext(actor), { vendorId: id, fromStatus, toStatus }),
    );

    return toVendorDetail(updated);
  }

  // ── Contacts ──────────────────────────────────────────────────────────────

  async addContact(
    vendorId: string,
    dto: CreateVendorContactDto,
    actor: RequestUser,
  ) {
    await this.assertExists(vendorId, actor.organizationId);

    // If this contact is primary, demote all existing primary contacts first
    if (dto.isPrimary) {
      await this.repo.demoteAllContacts(vendorId);
    }

    const contact = await this.repo.createContact({
      vendorId,
      organizationId: actor.organizationId,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      title: dto.title?.trim() ?? null,
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone?.trim() ?? null,
      linkedinUrl: dto.linkedinUrl ?? null,
      isPrimary: dto.isPrimary ?? false,
      isActive: true,
      notes: dto.notes ?? null,
      createdBy: actor.userId,
    });

    // Sync denormalised primary contact fields on the vendor
    if (dto.isPrimary) {
      await this.repo.update(vendorId, actor.organizationId, {
        primaryContactName:  `${dto.firstName.trim()} ${dto.lastName.trim()}`,
        primaryContactEmail: dto.email.trim().toLowerCase(),
        primaryContactPhone: dto.phone?.trim() ?? null,
        updatedBy: actor.userId,
      });
    }

    await this.repo.touchActivityAt(vendorId, actor.organizationId);

    this.events.emit(
      EventNames.VENDOR_CONTACT_ADDED,
      new VendorContactAddedEvent(this.actorContext(actor), {
        vendorId,
        contactId: contact.id,
        isPrimary: contact.isPrimary,
      }),
    );

    return contact;
  }

  async updateContact(
    vendorId: string,
    contactId: string,
    dto: UpdateVendorContactDto,
    actor: RequestUser,
  ) {
    await this.assertExists(vendorId, actor.organizationId);
    const existing = await this.repo.findContact(contactId, vendorId);
    if (!existing) throw new NotFoundException('Contact not found');

    const wasNotPrimary = !existing.isPrimary;
    const becomingPrimary = dto.isPrimary === true;

    if (becomingPrimary && wasNotPrimary) {
      await this.repo.demoteAllContacts(vendorId);
    }

    const updated = await this.repo.updateContact(contactId, {
      ...(dto.firstName   ? { firstName: dto.firstName.trim() } : {}),
      ...(dto.lastName    ? { lastName: dto.lastName.trim() } : {}),
      ...(dto.title !== undefined ? { title: dto.title?.trim() ?? null } : {}),
      ...(dto.email       ? { email: dto.email.trim().toLowerCase() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() ?? null } : {}),
      ...(dto.linkedinUrl !== undefined ? { linkedinUrl: dto.linkedinUrl ?? null } : {}),
      ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
    });

    // Sync denormalised fields if this contact is (or became) primary
    if (updated.isPrimary) {
      await this.repo.update(vendorId, actor.organizationId, {
        primaryContactName:  `${updated.firstName} ${updated.lastName}`,
        primaryContactEmail: updated.email,
        primaryContactPhone: updated.phone ?? null,
        updatedBy: actor.userId,
      });
    }

    await this.repo.touchActivityAt(vendorId, actor.organizationId);

    this.events.emit(
      EventNames.VENDOR_CONTACT_UPDATED,
      new VendorContactUpdatedEvent(this.actorContext(actor), { vendorId, contactId }),
    );

    return updated;
  }

  async removeContact(vendorId: string, contactId: string, actor: RequestUser): Promise<void> {
    await this.assertExists(vendorId, actor.organizationId);
    const contact = await this.repo.findContact(contactId, vendorId);
    if (!contact) throw new NotFoundException('Contact not found');

    await this.repo.deleteContact(contactId);

    // Clear denormalised primary contact if this was the primary contact
    if (contact.isPrimary) {
      // Find the next most-recent contact to promote (if any)
      const remaining = await this.repo.findContacts(vendorId);
      const next = remaining.find((c) => c.id !== contactId && c.isActive);
      if (next) {
        await this.repo.updateContact(next.id, { isPrimary: true });
        await this.repo.update(vendorId, actor.organizationId, {
          primaryContactName:  `${next.firstName} ${next.lastName}`,
          primaryContactEmail: next.email,
          primaryContactPhone: next.phone ?? null,
          updatedBy: actor.userId,
        });
      } else {
        await this.repo.update(vendorId, actor.organizationId, {
          primaryContactName: null,
          primaryContactEmail: null,
          primaryContactPhone: null,
          updatedBy: actor.userId,
        });
      }
    }

    this.events.emit(
      EventNames.VENDOR_CONTACT_REMOVED,
      new VendorContactRemovedEvent(this.actorContext(actor), { vendorId, contactId }),
    );
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  async addNote(vendorId: string, dto: CreateVendorNoteDto, actor: RequestUser) {
    await this.assertExists(vendorId, actor.organizationId);

    const note = await this.repo.createNote({
      vendorId,
      organizationId: actor.organizationId,
      content: dto.content.trim(),
      noteType: dto.noteType ?? NoteType.NOTE,
      authorId: actor.userId,
      authorEmail: actor.email,
      authorName: actor.email,
    });

    await this.repo.touchActivityAt(vendorId, actor.organizationId);

    this.events.emit(
      EventNames.VENDOR_NOTE_ADDED,
      new VendorNoteAddedEvent(this.actorContext(actor), {
        vendorId,
        noteId: note.id,
        noteType: note.noteType,
      }),
    );

    return note;
  }

  async getNotes(vendorId: string, actor: RequestUser) {
    await this.assertExists(vendorId, actor.organizationId);
    return this.repo.findNotes(vendorId, actor.organizationId);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async assertExists(id: string, organizationId: string) {
    const vendor = await this.repo.findByIdRaw(id, organizationId);
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }
}
