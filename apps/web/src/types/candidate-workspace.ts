import type { CandidateDetail } from './candidates';

// Mirrors apps/api/src/modules/candidates/types/workspace.types.ts but with
// JSON-serialized dates (string) and the web's CandidateDetail shape.

export type ResumeStatus = 'UPLOADED' | 'PARSING' | 'PARSED' | 'PARSE_FAILED' | 'READY';
export type ParsingJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type ReviewTaskStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type DuplicateConfidenceTier = 'EXACT' | 'PROBABLE' | 'POSSIBLE';

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
  profileCompleteness: number;
  healthScore:         number;
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
  score:   number;
  missing: string[];
  weights: Record<string, number>;
}

export interface WorkspaceResumeSummary {
  primaryResumeId:     string | null;
  primaryResumeStatus: ResumeStatus | null;
  latestVersionId:     string | null;
  latestFileName:      string | null;
  latestUploadedAt:    string | null;
  latestParsingState:  ParsingJobStatus | null;
  latestReviewState:   ReviewTaskStatus | null;
  versionCount:        number;
  resumeCount:         number;
}

export interface WorkspaceDuplicateMatch {
  id:                string;
  targetCandidateId: string;
  targetName:        string;
  confidenceTier:    DuplicateConfidenceTier;
  confidenceScore:   number;
  reasonCount:       number;
}

export interface WorkspaceDuplicateSummary {
  pending:     number;
  exact:       number;
  probable:    number;
  possible:    number;
  deferred:    number;
  latestRunId: string | null;
  latestRunAt: string | null;
  topMatches:  WorkspaceDuplicateMatch[];
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
  id:          string;
  scheduledAt: string | null;
  type:        string;
  round:       number;
  roundLabel:  string | null;
  status:      string;
  jobId:       string;
  jobTitle:    string;
  jobReqId:    string;
}

export interface WorkspaceOpenReminder {
  id:        string;
  title:     string;
  priority:  string;
  status:    string;
  dueAt:     string | null;
  type:      string;
  isOverdue: boolean;
}

export interface CandidateWorkspace {
  candidate:           CandidateDetail;
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
