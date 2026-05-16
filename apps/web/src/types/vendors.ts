export type VendorStatus   = 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'ARCHIVED';
export type VendorPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'STRATEGIC';
export type VendorType =
  | 'STAFFING_AGENCY'
  | 'CONSULTING_FIRM'
  | 'FREELANCE_PLATFORM'
  | 'RECRUITMENT_PARTNER'
  | 'DIRECT_CLIENT'
  | 'OTHER';
export type NoteType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'STATUS_CHANGE' | 'SYSTEM';

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
  /** Operational counts attached by the list service (V3+). */
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

export interface PotentialDuplicateVendor {
  id: string;
  companyName: string;
  website: string | null;
  primaryContactEmail: string | null;
  status: VendorStatus;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreateVendorDto {
  companyName: string;
  website?: string;
  type?: VendorType;
  priority?: VendorPriority;
  city?: string;
  stateProvince?: string;
  country?: string;
  timezone?: string;
  relationshipOwnerId?: string;
  domains?: string[];
  description?: string;
  contractDetails?: string;
  commissionRate?: string;
  paymentTermsDays?: number;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
}

export type UpdateVendorDto = Partial<CreateVendorDto>;

export interface CreateVendorContactDto {
  firstName: string;
  lastName: string;
  title?: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  isPrimary?: boolean;
  notes?: string;
}

export type UpdateVendorContactDto = Partial<CreateVendorContactDto>;

export interface CreateVendorNoteDto {
  content: string;
  noteType?: NoteType;
}

export interface ListVendorsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: VendorStatus[];
  type?: VendorType[];
  priority?: VendorPriority[];
  country?: string;
  domain?: string;
  relationshipOwnerId?: string;
  sortBy?: 'companyName' | 'createdAt' | 'lastActivity' | 'priority';
  sortOrder?: 'asc' | 'desc';
}
