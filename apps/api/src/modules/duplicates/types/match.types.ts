import type {
  DuplicateCandidateMatch,
  DuplicateConfidenceTier,
  DuplicateDetectionRun,
  DuplicateMatchStatus,
  DuplicateRunStatus,
  DuplicateRunTrigger,
} from '@repo/database';

/**
 * Explainable match reasons stored on DuplicateCandidateMatch.matchReasons.
 *
 * Every recruiter-facing duplicate suggestion is accompanied by one or more
 * MatchReasons. The UI renders them verbatim — kind drives the icon, label
 * is the human sentence, value carries the matched literal for display.
 *
 * No reason on a row = the match is unexplained, which means the producer
 * has a bug. The repository defaults the column to [].
 */
export type MatchReasonKind =
  | 'EMAIL_EXACT'
  | 'PHONE_EXACT'
  | 'LINKEDIN_EXACT'
  | 'NAME_TRGM'
  | 'NAME_COMPANY'
  | 'NAME_LOCATION'
  | 'NAME_PHONE_FRAGMENT'
  | 'SKILL_OVERLAP';

export interface MatchReason {
  kind: MatchReasonKind;
  label: string;
  value?: string;
  similarity?: number;
}

// ── Wire shapes ─────────────────────────────────────────────────────────────

export interface CandidateSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  city: string | null;
  country: string | null;
  status: string;
  resumeCount: number;
  submissionCount: number;
  interviewCount: number;
  skillNames: string[];
  createdAt: string;
}

export interface DuplicateMatchListItem {
  id: string;
  runId: string;
  organizationId: string;
  sourceCandidateId: string;
  targetCandidateId: string;
  sourceName: string;
  targetName: string;
  confidenceTier: DuplicateConfidenceTier;
  confidenceScore: number;
  reasonCount: number;
  matchReasons: MatchReason[];
  status: DuplicateMatchStatus;
  decidedAt: string | null;
  decidedById: string | null;
  createdAt: string;
}

export interface DuplicateMatchDetail extends DuplicateMatchListItem {
  decisionNotes: string | null;
  source: CandidateSummary;
  target: CandidateSummary;
  reviewTaskId: string | null;
}

export interface DuplicateRunSummary {
  id: string;
  organizationId: string;
  sourceCandidateId: string;
  triggeredBy: DuplicateRunTrigger;
  triggeredById: string;
  reviewTaskId: string | null;
  status: DuplicateRunStatus;
  totalMatches: number;
  exactMatches: number;
  probableMatches: number;
  possibleMatches: number;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface DuplicateRunDetail extends DuplicateRunSummary {
  matches: DuplicateMatchListItem[];
}

// ── Mappers ─────────────────────────────────────────────────────────────────

export function toRunSummary(r: DuplicateDetectionRun): DuplicateRunSummary {
  return {
    id: r.id,
    organizationId: r.organizationId,
    sourceCandidateId: r.sourceCandidateId,
    triggeredBy: r.triggeredBy,
    triggeredById: r.triggeredById,
    reviewTaskId: r.reviewTaskId,
    status: r.status,
    totalMatches: r.totalMatches,
    exactMatches: r.exactMatches,
    probableMatches: r.probableMatches,
    possibleMatches: r.possibleMatches,
    durationMs: r.durationMs,
    errorMessage: r.errorMessage,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  };
}

export function toMatchListItem(
  m: DuplicateCandidateMatch,
  sourceName: string,
  targetName: string,
): DuplicateMatchListItem {
  const reasons = (m.matchReasons as unknown as MatchReason[] | null) ?? [];
  return {
    id: m.id,
    runId: m.runId,
    organizationId: m.organizationId,
    sourceCandidateId: m.sourceCandidateId,
    targetCandidateId: m.targetCandidateId,
    sourceName,
    targetName,
    confidenceTier: m.confidenceTier,
    confidenceScore: Number(m.confidenceScore),
    reasonCount: reasons.length,
    matchReasons: reasons,
    status: m.status,
    decidedAt: m.decidedAt?.toISOString() ?? null,
    decidedById: m.decidedById,
    createdAt: m.createdAt.toISOString(),
  };
}
