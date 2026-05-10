import type {
  Candidate,
  JobDescription,
  NoteType,
  Submission,
  SubmissionNote,
  SubmissionStatus,
  SubmissionStatusHistory,
  User,
  Vendor,
} from '@repo/database';

// ── User mini-view ────────────────────────────────────────────────────────────

export interface UserMini {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ── Candidate mini-view ───────────────────────────────────────────────────────

export interface CandidateMini {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  currentTitle: string | null;
  location: string | null;
}

// ── Job mini-view ─────────────────────────────────────────────────────────────

export interface JobMini {
  id: string;
  reqId: string;
  title: string;
  department: string | null;
}

// ── Vendor mini-view ──────────────────────────────────────────────────────────

export interface VendorMini {
  id: string;
  companyName: string;
}

// ── Note view ─────────────────────────────────────────────────────────────────

export interface SubmissionNoteView {
  id: string;
  content: string;
  noteType: NoteType;
  isSystem: boolean;
  authorId: string | null;
  authorEmail: string | null;
  authorName: string | null;
  createdAt: Date;
}

// ── Status history view ───────────────────────────────────────────────────────

export interface SubmissionStatusHistoryView {
  id: string;
  fromStatus: SubmissionStatus | null;
  toStatus: SubmissionStatus;
  reason: string | null;
  changedById: string;
  changedByName: string;
  createdAt: Date;
}

// ── Submission list item ──────────────────────────────────────────────────────

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
  startDate: Date | null;
  submittedAt: Date | null;
  offeredAt: Date | null;
  placedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Submission detail ─────────────────────────────────────────────────────────

export interface SubmissionDetail extends SubmissionListItem {
  createdById: string;
  coverNote: string | null;
  rejectionReason: string | null;
  offerSalary: number | null;
  reviewedAt: Date | null;
  shortlistedAt: Date | null;
  interviewAt: Date | null;
  withdrawnAt: Date | null;
  closedAt: Date | null;
  notes: SubmissionNoteView[];
  statusHistory: SubmissionStatusHistoryView[];
}

// ── Pipeline stats ────────────────────────────────────────────────────────────

export interface PipelineStageCount {
  status: SubmissionStatus;
  count: number;
}

export interface SubmissionStats {
  total: number;
  byStatus: PipelineStageCount[];
}

// ── Prisma includes ───────────────────────────────────────────────────────────

export const SUBMISSION_LIST_INCLUDE = {
  candidate: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      currentTitle: true,
      city: true,
      country: true,
    },
  },
  job: {
    select: {
      id: true,
      reqId: true,
      title: true,
      department: true,
    },
  },
  vendor: {
    select: {
      id: true,
      companyName: true,
    },
  },
  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export const SUBMISSION_DETAIL_INCLUDE = {
  ...SUBMISSION_LIST_INCLUDE,
  notes: {
    orderBy: { createdAt: 'desc' as const },
    take: 100,
  },
  statusHistory: {
    include: {
      changedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

// ── Prisma payload types ──────────────────────────────────────────────────────

type SubmissionWithList = Submission & {
  candidate: Pick<Candidate, 'id' | 'firstName' | 'lastName' | 'email' | 'currentTitle' | 'city' | 'country'>;
  job: Pick<JobDescription, 'id' | 'reqId' | 'title' | 'department'>;
  vendor: Pick<Vendor, 'id' | 'companyName'> | null;
  owner: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
};

type SubmissionWithDetail = SubmissionWithList & {
  notes: SubmissionNote[];
  statusHistory: Array<SubmissionStatusHistory & {
    changedBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
  }>;
};

// ── Mappers ───────────────────────────────────────────────────────────────────

export function toSubmissionListItem(s: SubmissionWithList): SubmissionListItem {
  return {
    id: s.id,
    organizationId: s.organizationId,
    status: s.status,
    candidate: {
      id: s.candidate.id,
      firstName: s.candidate.firstName,
      lastName: s.candidate.lastName,
      email: s.candidate.email,
      currentTitle: s.candidate.currentTitle,
      location: [s.candidate.city, s.candidate.country].filter(Boolean).join(', ') || null,
    },
    job: {
      id: s.job.id,
      reqId: s.job.reqId,
      title: s.job.title,
      department: s.job.department,
    },
    vendor: s.vendor ? { id: s.vendor.id, companyName: s.vendor.companyName } : null,
    owner: {
      id: s.owner.id,
      firstName: s.owner.firstName,
      lastName: s.owner.lastName,
      email: s.owner.email,
    },
    billRate: s.billRate ? Number(s.billRate) : null,
    payRate: s.payRate ? Number(s.payRate) : null,
    currency: s.currency,
    startDate: s.startDate,
    submittedAt: s.submittedAt,
    offeredAt: s.offeredAt,
    placedAt: s.placedAt,
    rejectedAt: s.rejectedAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export function toSubmissionDetail(s: SubmissionWithDetail): SubmissionDetail {
  const base = toSubmissionListItem(s);
  return {
    ...base,
    createdById: s.createdById,
    coverNote: s.coverNote,
    rejectionReason: s.rejectionReason,
    offerSalary: s.offerSalary ? Number(s.offerSalary) : null,
    reviewedAt: s.reviewedAt,
    shortlistedAt: s.shortlistedAt,
    interviewAt: s.interviewAt,
    withdrawnAt: s.withdrawnAt,
    closedAt: s.closedAt,
    notes: s.notes.map((n) => ({
      id: n.id,
      content: n.content,
      noteType: n.noteType,
      isSystem: n.isSystem,
      authorId: n.authorId,
      authorEmail: n.authorEmail,
      authorName: n.authorName,
      createdAt: n.createdAt,
    })),
    statusHistory: s.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      changedById: h.changedById,
      changedByName: `${h.changedBy.firstName} ${h.changedBy.lastName}`,
      createdAt: h.createdAt,
    })),
  };
}
