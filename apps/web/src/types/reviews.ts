// Mirror of API wire shapes in apps/api/src/modules/resumes/types/review.types.ts

export type ReviewTaskStatus =
  | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'REPARSE_REQUESTED' | 'SUPERSEDED';

export type ReviewPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface ReviewDecisionPayload {
  acceptedFields?: Record<string, unknown>;
  editedFields?:   Record<string, { extracted?: unknown; edited: unknown; reason?: string }>;
  rejectedFields?: string[];
  candidateAction?: {
    kind: 'CREATE' | 'UPDATE';
    existingCandidateId?: string;
    fieldStrategy?: 'PREFER_RESUME' | 'PREFER_EXISTING' | 'MANUAL';
  };
  resumeLinkAction?: 'ATTACH_AS_CURRENT' | 'ATTACH_AS_VARIANT' | 'DISCARD';
  notes?: string;
}

export interface ReviewTaskListItem {
  id:                       string;
  organizationId:           string;
  status:                   ReviewTaskStatus;
  priority:                 ReviewPriority;
  assigneeId:               string | null;
  claimedAt:                string | null;
  claimExpiresAt:           string | null;
  slaDueAt:                 string | null;
  decidedAt:                string | null;
  resultingCandidateId:     string | null;
  predecessorReviewTaskId:  string | null;
  draftVersion:             number;
  overallConfidence:        number;
  resumeId:                 string;
  resumeVersionId:          string;
  resumeFileName:           string;
  candidateId:              string;
  candidateName:            string;
  createdAt:                string;
  updatedAt:                string;
}

export interface ReviewTaskDetail extends ReviewTaskListItem {
  payload:        unknown;     // ExtractionPayload — used at runtime, not type-narrowed
  confidence:     Record<string, number>;
  rawText:        string | null;
  parserMetadata: Record<string, unknown>;
  draftDecision:  ReviewDecisionPayload | null;
  decision:       ReviewDecisionPayload | null;
  decisionNotes:  string | null;
  decidedById:    string | null;
  parsingJob: {
    id:           string;
    provider:     string;
    attempt:      number;
    durationMs:   number | null;
  } | null;
}

export interface ListReviewsParams {
  status?:     ReviewTaskStatus;
  priority?:   ReviewPriority;
  assigneeId?: string;
  mineOnly?:   boolean;
  page?:       number;
  limit?:      number;
}

export interface SaveDraftBody { decision: ReviewDecisionPayload; baseVersion: number }
export interface ApproveBody  { decision: ReviewDecisionPayload; acknowledgeDuplicates?: boolean }
export interface RejectBody   { reason:   string }
export interface ReparseBody  { provider?: string; notes?: string }

// ── Display ──────────────────────────────────────────────────────────────

export const REVIEW_STATUS_LABELS: Record<ReviewTaskStatus, string> = {
  PENDING:           'Pending',
  IN_REVIEW:         'In review',
  APPROVED:          'Approved',
  REJECTED:          'Rejected',
  REPARSE_REQUESTED: 'Reparse requested',
  SUPERSEDED:        'Superseded',
};

export const REVIEW_PRIORITY_LABELS: Record<ReviewPriority, string> = {
  LOW:    'Low',
  NORMAL: 'Normal',
  HIGH:   'High',
  URGENT: 'Urgent',
};
