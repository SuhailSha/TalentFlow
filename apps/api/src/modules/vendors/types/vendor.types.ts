import type { NoteType, Prisma, VendorPriority, VendorStatus, VendorType } from '@repo/database';

// ── Include constants ──────────────────────────────────────────────────────────

export const VENDOR_DETAIL_INCLUDE = {
  contacts: {
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
} satisfies Prisma.VendorInclude;

// ── View types ─────────────────────────────────────────────────────────────────

export interface VendorContactView {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string | null;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

export interface VendorNoteView {
  id: string;
  content: string;
  noteType: NoteType;
  authorId: string | null;
  authorEmail: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface PotentialDuplicateVendor {
  id: string;
  companyName: string;
  website: string | null;
  primaryContactEmail: string | null;
  status: VendorStatus;
}

export interface VendorListItem {
  id: string;
  organizationId: string;
  companyName: string;
  vendorCode: string | null;
  type: VendorType;
  status: VendorStatus;
  priority: VendorPriority;
  location: string | null;
  domains: string[];
  /**
   * Operational signals enriched by the service layer when listing.
   * Omitted on raw single-vendor reads (use the workspace endpoint there).
   */
  activeSubmissionCount?: number;
  stalledSubmissionCount?: number;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  relationshipOwnerId: string | null;
  lastActivityAt: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorDetail extends VendorListItem {
  website: string | null;
  primaryContactPhone: string | null;
  city: string | null;
  stateProvince: string | null;
  country: string | null;
  timezone: string | null;
  description: string | null;
  contractDetails: string | null;
  commissionRate: number | null;
  paymentTermsDays: number | null;
  activatedAt: string | null;
  contacts: VendorContactView[];
  notes: VendorNoteView[];
  createdBy: string | null;
  updatedBy: string | null;
}

// ── Mapper functions ───────────────────────────────────────────────────────────

type VendorRow = Prisma.VendorGetPayload<{ include: typeof VENDOR_DETAIL_INCLUDE }>;
type VendorRaw = Prisma.VendorGetPayload<Record<string, never>>;

function computeLocation(city?: string | null, country?: string | null): string | null {
  const parts = [city, country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function mapContact(c: VendorRow['contacts'][number]): VendorContactView {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    fullName: `${c.firstName} ${c.lastName}`,
    title: c.title ?? null,
    email: c.email,
    phone: c.phone ?? null,
    linkedinUrl: c.linkedinUrl ?? null,
    isPrimary: c.isPrimary,
    isActive: c.isActive,
    notes: c.notes ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

function mapNote(n: VendorRow['notes'][number]): VendorNoteView {
  return {
    id: n.id,
    content: n.content,
    noteType: n.noteType,
    authorId: n.authorId ?? null,
    authorEmail: n.authorEmail ?? null,
    authorName: n.authorName ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

function baseListItem(v: VendorRaw): VendorListItem {
  return {
    id: v.id,
    organizationId: v.organizationId,
    companyName: v.companyName,
    vendorCode: v.vendorCode ?? null,
    type: v.type,
    status: v.status,
    priority: v.priority,
    location: computeLocation(v.city, v.country),
    domains: v.domains,
    primaryContactName: v.primaryContactName ?? null,
    primaryContactEmail: v.primaryContactEmail ?? null,
    relationshipOwnerId: v.relationshipOwnerId ?? null,
    lastActivityAt: v.lastActivityAt?.toISOString() ?? null,
    lastContactedAt: v.lastContactedAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export function toVendorListItem(v: VendorRaw): VendorListItem {
  return baseListItem(v);
}

export function toVendorDetail(v: VendorRow): VendorDetail {
  return {
    ...baseListItem(v),
    website: v.website ?? null,
    primaryContactPhone: v.primaryContactPhone ?? null,
    city: v.city ?? null,
    stateProvince: v.stateProvince ?? null,
    country: v.country ?? null,
    timezone: v.timezone ?? null,
    description: v.description ?? null,
    contractDetails: v.contractDetails ?? null,
    commissionRate: v.commissionRate ? Number(v.commissionRate) : null,
    paymentTermsDays: v.paymentTermsDays ?? null,
    activatedAt: v.activatedAt?.toISOString() ?? null,
    contacts: v.contacts.map(mapContact),
    notes: v.notes.map(mapNote),
    createdBy: v.createdBy ?? null,
    updatedBy: v.updatedBy ?? null,
  };
}
