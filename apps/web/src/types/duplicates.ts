// Mirror of API wire shapes in apps/api/src/modules/duplicates/types/match.types.ts

export type DuplicateConfidenceTier = 'EXACT' | 'PROBABLE' | 'POSSIBLE';
export type DuplicateMatchStatus =
  | 'PENDING' | 'NOT_DUPLICATE' | 'DEFERRED' | 'SUPERSEDED' | 'CONFIRMED_DUPLICATE';
export type DuplicateRunStatus  = 'RUNNING' | 'COMPLETED' | 'FAILED';
export type DuplicateRunTrigger = 'REVIEW_APPROVE' | 'MANUAL_SCAN' | 'API_BATCH';

export type MatchReasonKind =
  | 'EMAIL_EXACT' | 'PHONE_EXACT' | 'LINKEDIN_EXACT'
  | 'NAME_TRGM' | 'NAME_COMPANY' | 'NAME_LOCATION' | 'NAME_PHONE_FRAGMENT'
  | 'SKILL_OVERLAP';

export interface MatchReason {
  kind:        MatchReasonKind;
  label:       string;
  value?:      string;
  similarity?: number;
}

export interface CandidateSummary {
  id:              string;
  firstName:       string;
  lastName:        string;
  fullName:        string;
  email:           string;
  phone:           string | null;
  linkedinUrl:     string | null;
  currentTitle:    string | null;
  currentCompany:  string | null;
  city:            string | null;
  country:         string | null;
  status:          string;
  resumeCount:     number;
  submissionCount: number;
  interviewCount:  number;
  skillNames:      string[];
  createdAt:       string;
}

export interface DuplicateMatchListItem {
  id:                 string;
  runId:              string;
  organizationId:     string;
  sourceCandidateId:  string;
  targetCandidateId:  string;
  sourceName:         string;
  targetName:         string;
  confidenceTier:     DuplicateConfidenceTier;
  confidenceScore:    number;
  reasonCount:        number;
  matchReasons:       MatchReason[];
  status:             DuplicateMatchStatus;
  decidedAt:          string | null;
  decidedById:        string | null;
  createdAt:          string;
}

export interface DuplicateMatchDetail extends DuplicateMatchListItem {
  decisionNotes: string | null;
  source:        CandidateSummary;
  target:        CandidateSummary;
  reviewTaskId:  string | null;
}

export interface DuplicateRunSummary {
  id:                 string;
  organizationId:     string;
  sourceCandidateId:  string;
  triggeredBy:        DuplicateRunTrigger;
  triggeredById:      string;
  reviewTaskId:       string | null;
  status:             DuplicateRunStatus;
  totalMatches:       number;
  exactMatches:       number;
  probableMatches:    number;
  possibleMatches:    number;
  durationMs:         number | null;
  errorMessage:       string | null;
  createdAt:          string;
  completedAt:        string | null;
}

export interface DuplicateRunDetail extends DuplicateRunSummary {
  matches: DuplicateMatchListItem[];
}

export interface ListDuplicateMatchesParams {
  status?:           DuplicateMatchStatus;
  tier?:             DuplicateConfidenceTier;
  sourceCandidateId?: string;
  page?:             number;
  limit?:            number;
}

// ── Display ─────────────────────────────────────────────────────────────────

export const TIER_LABELS: Record<DuplicateConfidenceTier, string> = {
  EXACT:    'Exact',
  PROBABLE: 'Probable',
  POSSIBLE: 'Possible',
};

export const MATCH_STATUS_LABELS: Record<DuplicateMatchStatus, string> = {
  PENDING:             'Pending',
  NOT_DUPLICATE:       'Not duplicate',
  DEFERRED:            'Deferred',
  SUPERSEDED:          'Superseded',
  CONFIRMED_DUPLICATE: 'Confirmed (merge queued)',
};
