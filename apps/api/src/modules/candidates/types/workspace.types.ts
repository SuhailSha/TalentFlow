/**
 * Aggregated payload backing GET /candidates/:id/workspace.
 *
 * Single round-trip for the entire candidate workspace screen. Mirrors the
 * vendor-workspace pattern (apps/api/src/modules/vendors/vendor-workspace).
 *
 * The workspace endpoint does the fan-out so the web page renders without
 * waterfall queries. Add bounded eager fields here; never load arbitrary
 * relations.
 */

import type {
  Candidate, ResumeStatus, ParsingJobStatus, ReviewTaskStatus,
  DuplicateConfidenceTier,
} from '@repo/database';

export interface WorkspaceOwner {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  fullName:  string;
}

export interface WorkspaceMetrics {
  activeSubmissions:   number;
  totalSubmissions:    number;
  placedCount:         number;
  upcomingInterviews:  number;
  pendingFeedback:     number;
  openReminders:       number;
  overdueReminders:    number;
  resumeCount:         number;
  pendingDuplicates:   number;
  exactDuplicates:     number;
  daysSinceActivity:   number | null;
  profileCompleteness: number;   // 0–100
  healthScore:         number;   // 0–100
}

export interface WorkspaceHealthSignals {
  isStale:                 boolean;
  hasOverdueReminders:     boolean;
  hasPendingFeedback:      boolean;
  hasResumesPendingReview: boolean;
  hasDuplicatesPending:    boolean;
  hasNoActiveSubmissions:  boolean;
  isProfileIncomplete:     boolean;
}

export interface WorkspaceProfileCompleteness {
  score:          number;
  missing:        string[];  // human-readable list of missing fields
  weights:        Record<string, number>; // per-field weight contribution
}

export interface WorkspaceResumeSummary {
  primaryResumeId:      string | null;
  primaryResumeStatus:  ResumeStatus | null;
  latestVersionId:      string | null;
  latestFileName:       string | null;
  latestUploadedAt:     string | null;
  latestParsingState:   ParsingJobStatus | null;
  latestReviewState:    ReviewTaskStatus | null;
  versionCount:         number;
  resumeCount:          number;
}

export interface WorkspaceDuplicateSummary {
  pending:       number;
  exact:         number;
  probable:      number;
  possible:      number;
  deferred:      number;
  latestRunId:   string | null;
  latestRunAt:   string | null;
  topMatches:    Array<{
    id:              string;
    targetCandidateId: string;
    targetName:      string;
    confidenceTier:  DuplicateConfidenceTier;
    confidenceScore: number;
    reasonCount:     number;
  }>;
}

export interface WorkspaceTopRecruiter {
  id:              string;
  firstName:       string;
  lastName:        string;
  fullName:        string;
  submissionCount: number;
}

export interface WorkspaceTopVendor {
  id:              string;
  companyName:     string;
  submissionCount: number;
}

export interface WorkspacePipelineBucket {
  status: string;
  count:  number;
}

export interface WorkspaceUpcomingInterview {
  id:           string;
  scheduledAt:  string | null;
  type:         string;
  round:        number;
  roundLabel:   string | null;
  status:       string;
  jobId:        string;
  jobTitle:     string;
  jobReqId:     string;
}

export interface WorkspaceOpenReminder {
  id:          string;
  title:       string;
  priority:    string;
  status:      string;
  dueAt:       string | null;
  type:        string;
  isOverdue:   boolean;
}

export interface CandidateWorkspace {
  candidate:           Candidate;            // raw model — web type narrows it
  owner:               WorkspaceOwner | null;
  metrics:             WorkspaceMetrics;
  health:              WorkspaceHealthSignals;
  profileCompleteness: WorkspaceProfileCompleteness;
  resumeSummary:       WorkspaceResumeSummary;
  duplicateSummary:    WorkspaceDuplicateSummary;
  pipeline:            WorkspacePipelineBucket[];
  upcomingInterviews:  WorkspaceUpcomingInterview[];
  openReminders:       WorkspaceOpenReminder[];
  topRecruiters:       WorkspaceTopRecruiter[];
  topVendors:          WorkspaceTopVendor[];
}
