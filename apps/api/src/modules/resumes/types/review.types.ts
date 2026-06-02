import type { ReviewPriority, ReviewTask, ReviewTaskStatus } from '@repo/database';

import type { ExtractionPayload, ConfidenceMap } from './extraction-payload';

/**
 * Shape of ReviewTask.draftDecision and (after terminal transition) decision.
 *
 * Mirrors the architecture review's ReviewDecision contract:
 *   - acceptedFields: the recruiter accepted the extracted value as-is
 *   - editedFields:   the recruiter changed the value to `edited`
 *   - rejectedFields: the recruiter explicitly threw the field away
 *
 * candidateAction declares what the approval will do downstream:
 *   - CREATE: the linked draft candidate is promoted to ACTIVE with the
 *             extracted + edited fields applied
 *   - UPDATE: an existing candidate is updated with the chosen fields
 *             (R3 always uses the upload-linked draft; merge/duplicate-detection
 *             is R4+)
 *   - MERGE:  N/A in R3
 */
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

// ── Wire types ──────────────────────────────────────────────────────────────

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
  // Context columns for the list table
  resumeId:                 string;
  resumeVersionId:          string;
  resumeFileName:           string;
  candidateId:              string;
  candidateName:            string;
  createdAt:                string;
  updatedAt:                string;
}

export interface ReviewTaskDetail extends ReviewTaskListItem {
  /** Latest extraction payload (already post-stripper). */
  payload:        ExtractionPayload;
  confidence:     ConfidenceMap;
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

// ── Mappers ─────────────────────────────────────────────────────────────────

type ReviewTaskWithExtraction = ReviewTask & {
  /**
   * Loose extraction shape so both the list (narrow include) and the detail
   * (full include) Prisma queries can flow through the same mapper. Fields
   * the mapper touches are typed; the rest is intentionally open.
   */
  extractionResult: ({
    overallConfidence?: unknown;
    payload?:           unknown;
    confidence?:        unknown;
    rawText?:           string | null;
    parserMetadata?:    unknown;
    parsingJob?:        { id: string; provider: string; attempt: number; durationMs: number | null } | null;
    resumeVersion?: {
      id:        string;
      fileName?: string;
      resume:    { id: string; candidateId: string };
    } | null;
  } & Record<string, unknown>) | null;
  candidate?: { id: string; firstName: string; lastName: string } | null;
};

export function toReviewListItem(t: ReviewTaskWithExtraction): ReviewTaskListItem {
  const v = t.extractionResult?.resumeVersion;
  const c = t.candidate;
  const conf = t.extractionResult?.overallConfidence;
  return {
    id:                      t.id,
    organizationId:          t.organizationId,
    status:                  t.status,
    priority:                t.priority,
    assigneeId:              t.assigneeId,
    claimedAt:               t.claimedAt?.toISOString()      ?? null,
    claimExpiresAt:          t.claimExpiresAt?.toISOString() ?? null,
    slaDueAt:                t.slaDueAt?.toISOString()       ?? null,
    decidedAt:               t.decidedAt?.toISOString()      ?? null,
    resultingCandidateId:    t.resultingCandidateId,
    predecessorReviewTaskId: t.predecessorReviewTaskId,
    draftVersion:            t.draftVersion,
    overallConfidence:       conf == null ? 0 : Number(conf),
    resumeId:                v?.resume.id     ?? '',
    resumeVersionId:         v?.id            ?? '',
    resumeFileName:          v?.fileName      ?? '',
    candidateId:             v?.resume.candidateId ?? '',
    candidateName:           c ? `${c.firstName} ${c.lastName}` : '',
    createdAt:               t.createdAt.toISOString(),
    updatedAt:               t.updatedAt.toISOString(),
  };
}

export function toReviewDetail(t: ReviewTaskWithExtraction): ReviewTaskDetail {
  const base = toReviewListItem(t);
  const ext  = t.extractionResult;
  return {
    ...base,
    payload:        (ext?.payload as ExtractionPayload) ?? {},
    confidence:     (ext?.confidence as ConfidenceMap)  ?? {},
    rawText:        ext?.rawText ?? null,
    parserMetadata: (ext?.parserMetadata as Record<string, unknown>) ?? {},
    draftDecision:  (t.draftDecision as ReviewDecisionPayload | null) ?? null,
    decision:       (t.decision      as ReviewDecisionPayload | null) ?? null,
    decisionNotes:  t.decisionNotes,
    decidedById:    t.decidedById,
    parsingJob:     ext?.parsingJob
      ? {
          id:         ext.parsingJob.id,
          provider:   ext.parsingJob.provider,
          attempt:    ext.parsingJob.attempt,
          durationMs: ext.parsingJob.durationMs ?? null,
        }
      : null,
  };
}
