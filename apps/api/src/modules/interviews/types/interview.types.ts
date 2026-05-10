import type {
  Candidate,
  FeedbackRecommendation,
  Interview,
  InterviewFeedback,
  InterviewNote,
  InterviewParticipant,
  InterviewParticipantRole,
  InterviewStatus,
  InterviewStatusHistory,
  InterviewType,
  JobDescription,
  NoteType,
  Submission,
  User,
} from '@repo/database';

// ── Mini views ────────────────────────────────────────────────────────────────

export interface CandidateMini {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  currentTitle: string | null;
}

export interface JobMini {
  id: string;
  reqId: string;
  title: string;
  department: string | null;
}

export interface SubmissionMini {
  id: string;
  status: string;
}

export interface UserMini {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ── Feedback view ─────────────────────────────────────────────────────────────

export interface InterviewFeedbackView {
  id: string;
  submittedById: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  recommendation: FeedbackRecommendation | null;
  technicalScore: number | null;
  communicationScore: number | null;
  cultureFitScore: number | null;
  overallScore: number | null;
  strengths: string | null;
  concerns: string | null;
  notes: string | null;
  isSubmitted: boolean;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Note view ─────────────────────────────────────────────────────────────────

export interface InterviewNoteView {
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

export interface InterviewStatusHistoryView {
  id: string;
  fromStatus: InterviewStatus | null;
  toStatus: InterviewStatus;
  reason: string | null;
  changedById: string;
  changedByName: string;
  createdAt: Date;
}

// ── Participant view ──────────────────────────────────────────────────────────

export interface InterviewParticipantView {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  role: InterviewParticipantRole;
  hasConfirmed: boolean;
  confirmedAt: Date | null;
}

// ── List item ─────────────────────────────────────────────────────────────────

export interface InterviewListItem {
  id: string;
  organizationId: string;
  submissionId: string;
  round: number;
  roundLabel: string | null;
  type: InterviewType;
  status: InterviewStatus;
  candidate: CandidateMini;
  job: JobMini;
  submission: SubmissionMini;
  owner: UserMini;
  interviewerId: string | null;
  interviewerName: string | null;
  interviewerEmail: string | null;
  scheduledAt: Date | null;
  durationMinutes: number | null;
  timezone: string | null;
  location: string | null;
  confirmedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  passedAt: Date | null;
  failedAt: Date | null;
  cancelledAt: Date | null;
  noShowAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Detail view ───────────────────────────────────────────────────────────────

export interface InterviewDetail extends InterviewListItem {
  rescheduledFromId: string | null;
  cancellationReason: string | null;
  briefingNotes: string | null;
  feedback: InterviewFeedbackView[];
  notes: InterviewNoteView[];
  statusHistory: InterviewStatusHistoryView[];
  participants: InterviewParticipantView[];
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

export interface InterviewStats {
  total: number;
  upcoming: number;          // SCHEDULED/CONFIRMED with scheduledAt in future
  feedbackPending: number;   // FEEDBACK_PENDING
  noShows: number;           // NO_SHOW
  completedToday: number;    // COMPLETED/PASSED/FAILED today
}

// ── Prisma includes ───────────────────────────────────────────────────────────

export const INTERVIEW_LIST_INCLUDE = {
  candidate: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      currentTitle: true,
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
  submission: {
    select: {
      id: true,
      status: true,
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

export const INTERVIEW_DETAIL_INCLUDE = {
  ...INTERVIEW_LIST_INCLUDE,
  feedback: {
    orderBy: { createdAt: 'asc' as const },
  },
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
  participants: {
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

// ── Prisma payload types ──────────────────────────────────────────────────────

type InterviewWithList = Interview & {
  candidate: Pick<Candidate, 'id' | 'firstName' | 'lastName' | 'email' | 'currentTitle'>;
  job: Pick<JobDescription, 'id' | 'reqId' | 'title' | 'department'>;
  submission: Pick<Submission, 'id' | 'status'>;
  owner: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
};

type InterviewWithDetail = InterviewWithList & {
  feedback: InterviewFeedback[];
  notes: InterviewNote[];
  statusHistory: Array<InterviewStatusHistory & {
    changedBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
  }>;
  participants: InterviewParticipant[];
};

// ── Mappers ───────────────────────────────────────────────────────────────────

export function toInterviewListItem(i: InterviewWithList): InterviewListItem {
  return {
    id: i.id,
    organizationId: i.organizationId,
    submissionId: i.submissionId,
    round: i.round,
    roundLabel: i.roundLabel,
    type: i.type,
    status: i.status,
    candidate: {
      id: i.candidate.id,
      firstName: i.candidate.firstName,
      lastName: i.candidate.lastName,
      email: i.candidate.email,
      currentTitle: i.candidate.currentTitle,
    },
    job: {
      id: i.job.id,
      reqId: i.job.reqId,
      title: i.job.title,
      department: i.job.department,
    },
    submission: {
      id: i.submission.id,
      status: i.submission.status,
    },
    owner: {
      id: i.owner.id,
      firstName: i.owner.firstName,
      lastName: i.owner.lastName,
      email: i.owner.email,
    },
    interviewerId: i.interviewerId,
    interviewerName: i.interviewerName,
    interviewerEmail: i.interviewerEmail,
    scheduledAt: i.scheduledAt,
    durationMinutes: i.durationMinutes,
    timezone: i.timezone,
    location: i.location,
    confirmedAt: i.confirmedAt,
    startedAt: i.startedAt,
    completedAt: i.completedAt,
    passedAt: i.passedAt,
    failedAt: i.failedAt,
    cancelledAt: i.cancelledAt,
    noShowAt: i.noShowAt,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

export function toInterviewDetail(i: InterviewWithDetail): InterviewDetail {
  const base = toInterviewListItem(i);
  return {
    ...base,
    rescheduledFromId: i.rescheduledFromId,
    cancellationReason: i.cancellationReason,
    briefingNotes: i.briefingNotes,
    feedback: i.feedback.map((f) => ({
      id: f.id,
      submittedById: f.submittedById,
      submitterName: f.submitterName,
      submitterEmail: f.submitterEmail,
      recommendation: f.recommendation,
      technicalScore: f.technicalScore,
      communicationScore: f.communicationScore,
      cultureFitScore: f.cultureFitScore,
      overallScore: f.overallScore,
      strengths: f.strengths,
      concerns: f.concerns,
      notes: f.notes,
      isSubmitted: f.isSubmitted,
      submittedAt: f.submittedAt,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
    notes: i.notes.map((n) => ({
      id: n.id,
      content: n.content,
      noteType: n.noteType,
      isSystem: n.isSystem,
      authorId: n.authorId,
      authorEmail: n.authorEmail,
      authorName: n.authorName,
      createdAt: n.createdAt,
    })),
    statusHistory: i.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      changedById: h.changedById,
      changedByName: `${h.changedBy.firstName} ${h.changedBy.lastName}`,
      createdAt: h.createdAt,
    })),
    participants: i.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      email: p.email,
      role: p.role,
      hasConfirmed: p.hasConfirmed,
      confirmedAt: p.confirmedAt,
    })),
  };
}
