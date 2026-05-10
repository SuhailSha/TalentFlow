export type SubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'OFFERED'
  | 'PLACED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ON_HOLD'
  | 'CLOSED';

export type NoteType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'STATUS_CHANGE' | 'SYSTEM';

// ── Mini views ────────────────────────────────────────────────────────────────

export interface CandidateMini {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  currentTitle: string | null;
  location: string | null;
}

export interface JobMini {
  id: string;
  reqId: string;
  title: string;
  department: string | null;
}

export interface VendorMini {
  id: string;
  companyName: string;
}

export interface UserMini {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ── Note / history ────────────────────────────────────────────────────────────

export interface SubmissionNoteView {
  id: string;
  content: string;
  noteType: NoteType;
  isSystem: boolean;
  authorId: string | null;
  authorEmail: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface SubmissionStatusHistoryView {
  id: string;
  fromStatus: SubmissionStatus | null;
  toStatus: SubmissionStatus;
  reason: string | null;
  changedById: string;
  changedByName: string;
  createdAt: string;
}

// ── List / detail views ───────────────────────────────────────────────────────

export interface SubmissionListItem {
  id: string;
  organizationId: string;
  status: SubmissionStatus;
  candidate: CandidateMini;
  job: JobMini;
  vendor: VendorMini | null;
  owner: UserMini;
  billRate: number | null;
  payRate: number | null;
  currency: string;
  startDate: string | null;
  submittedAt: string | null;
  offeredAt: string | null;
  placedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionDetail extends SubmissionListItem {
  createdById: string;
  coverNote: string | null;
  rejectionReason: string | null;
  offerSalary: number | null;
  reviewedAt: string | null;
  shortlistedAt: string | null;
  interviewAt: string | null;
  withdrawnAt: string | null;
  closedAt: string | null;
  notes: SubmissionNoteView[];
  statusHistory: SubmissionStatusHistoryView[];
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface PipelineStageCount {
  status: SubmissionStatus;
  count: number;
}

export interface SubmissionStats {
  total: number;
  byStatus: PipelineStageCount[];
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreateSubmissionDto {
  candidateId: string;
  jobId: string;
  vendorId?: string;
  ownerId?: string;
  billRate?: number;
  payRate?: number;
  currency?: string;
  offerSalary?: number;
  startDate?: string;
  coverNote?: string;
}

export interface UpdateSubmissionDto {
  ownerId?: string;
  vendorId?: string;
  billRate?: number;
  payRate?: number;
  currency?: string;
  offerSalary?: number;
  startDate?: string;
  coverNote?: string;
}

export interface ChangeStatusDto {
  status: SubmissionStatus;
  reason?: string;
}

export interface CreateSubmissionNoteDto {
  content: string;
  noteType?: NoteType;
}

export interface ListSubmissionsParams {
  page?: number;
  limit?: number;
  status?: SubmissionStatus[];
  candidateId?: string;
  jobId?: string;
  vendorId?: string;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
