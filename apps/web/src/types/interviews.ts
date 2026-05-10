export type InterviewStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FEEDBACK_PENDING'
  | 'PASSED'
  | 'FAILED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type InterviewType =
  | 'PHONE'
  | 'VIDEO'
  | 'ONSITE'
  | 'PANEL'
  | 'TECHNICAL'
  | 'BEHAVIORAL'
  | 'CASE_STUDY'
  | 'OTHER';

export type FeedbackRecommendation =
  | 'STRONG_YES'
  | 'YES'
  | 'NEUTRAL'
  | 'NO'
  | 'STRONG_NO';

export type InterviewParticipantRole = 'INTERVIEWER' | 'OBSERVER' | 'COORDINATOR';

export type NoteType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'STATUS_CHANGE' | 'SYSTEM';

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

// ── Detail sub-views ──────────────────────────────────────────────────────────

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
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewNoteView {
  id: string;
  content: string;
  noteType: NoteType;
  isSystem: boolean;
  authorId: string | null;
  authorEmail: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface InterviewStatusHistoryView {
  id: string;
  fromStatus: InterviewStatus | null;
  toStatus: InterviewStatus;
  reason: string | null;
  changedById: string;
  changedByName: string;
  createdAt: string;
}

export interface InterviewParticipantView {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  role: InterviewParticipantRole;
  hasConfirmed: boolean;
  confirmedAt: string | null;
}

// ── List / detail views ───────────────────────────────────────────────────────

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
  scheduledAt: string | null;
  durationMinutes: number | null;
  timezone: string | null;
  location: string | null;
  confirmedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  passedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewDetail extends InterviewListItem {
  rescheduledFromId: string | null;
  cancellationReason: string | null;
  briefingNotes: string | null;
  feedback: InterviewFeedbackView[];
  notes: InterviewNoteView[];
  statusHistory: InterviewStatusHistoryView[];
  participants: InterviewParticipantView[];
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface InterviewStats {
  total: number;
  upcoming: number;
  feedbackPending: number;
  noShows: number;
  completedToday: number;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface ScheduleInterviewDto {
  submissionId: string;
  round: number;
  roundLabel?: string;
  type: InterviewType;
  ownerId?: string;
  interviewerId?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  timezone?: string;
  location?: string;
  briefingNotes?: string;
}

export interface UpdateInterviewDto {
  type?: InterviewType;
  roundLabel?: string;
  ownerId?: string;
  interviewerId?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  timezone?: string;
  location?: string;
  briefingNotes?: string;
}

export interface ChangeInterviewStatusDto {
  status: InterviewStatus;
  reason?: string;
}

export interface CreateInterviewNoteDto {
  content: string;
  noteType?: NoteType;
}

export interface CreateFeedbackDto {
  recommendation?: FeedbackRecommendation;
  technicalScore?: number;
  communicationScore?: number;
  cultureFitScore?: number;
  overallScore?: number;
  strengths?: string;
  concerns?: string;
  notes?: string;
}

export interface AddParticipantDto {
  userId?: string;
  name: string;
  email: string;
  role: InterviewParticipantRole;
}

export interface ListInterviewsParams {
  page?: number;
  limit?: number;
  status?: InterviewStatus[];
  type?: InterviewType[];
  submissionId?: string;
  candidateId?: string;
  jobId?: string;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  SCHEDULED:       'Scheduled',
  CONFIRMED:       'Confirmed',
  RESCHEDULED:     'Rescheduled',
  IN_PROGRESS:     'In Progress',
  COMPLETED:       'Completed',
  FEEDBACK_PENDING: 'Feedback Pending',
  PASSED:          'Passed',
  FAILED:          'Failed',
  NO_SHOW:         'No Show',
  CANCELLED:       'Cancelled',
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  PHONE:      'Phone',
  VIDEO:      'Video',
  ONSITE:     'On-site',
  PANEL:      'Panel',
  TECHNICAL:  'Technical',
  BEHAVIORAL: 'Behavioral',
  CASE_STUDY: 'Case Study',
  OTHER:      'Other',
};

export const TERMINAL_STATUSES: InterviewStatus[] = [
  'PASSED', 'FAILED', 'CANCELLED',
];

export const FSM_TRANSITIONS: Partial<Record<InterviewStatus, InterviewStatus[]>> = {
  SCHEDULED:        ['CONFIRMED', 'RESCHEDULED', 'NO_SHOW', 'CANCELLED'],
  CONFIRMED:        ['IN_PROGRESS', 'RESCHEDULED', 'NO_SHOW', 'CANCELLED'],
  RESCHEDULED:      ['CONFIRMED', 'CANCELLED'],
  IN_PROGRESS:      ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
  COMPLETED:        ['FEEDBACK_PENDING'],
  FEEDBACK_PENDING: ['PASSED', 'FAILED'],
  NO_SHOW:          ['RESCHEDULED', 'CANCELLED'],
};
