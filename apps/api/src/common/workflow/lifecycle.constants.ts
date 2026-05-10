import { CandidateStatus, InterviewStatus, JobStatus, SubmissionStatus, VendorStatus } from '@repo/database';

import type { FsmDefinition } from './fsm.types';

// ── Candidate lifecycle ────────────────────────────────────────────────────────
// High-level state only. The submission pipeline owns the screening/interview/
// offer/hired progression — candidate status reflects placement outcome only.
//
// ACTIVE ↔ INACTIVE ↔ AVAILABLE → PLACED (terminal for tracking)
// Any non-terminal → BLACKLISTED (terminal)
export const CANDIDATE_FSM: FsmDefinition<CandidateStatus> = {
  transitions: {
    [CandidateStatus.ACTIVE]:      [CandidateStatus.INACTIVE, CandidateStatus.AVAILABLE, CandidateStatus.BLACKLISTED],
    [CandidateStatus.INACTIVE]:    [CandidateStatus.ACTIVE,   CandidateStatus.AVAILABLE, CandidateStatus.BLACKLISTED],
    [CandidateStatus.AVAILABLE]:   [CandidateStatus.ACTIVE,   CandidateStatus.INACTIVE,  CandidateStatus.PLACED, CandidateStatus.BLACKLISTED],
    [CandidateStatus.PLACED]:      [],  // terminal — managed via submissions
    [CandidateStatus.BLACKLISTED]: [],  // terminal
  },
  terminal: [CandidateStatus.PLACED, CandidateStatus.BLACKLISTED],
};

// ── Job lifecycle ──────────────────────────────────────────────────────────────
// DRAFT → OPEN ↔ ON_HOLD → FILLED/CANCELLED → ARCHIVED (terminal)
export const JOB_FSM: FsmDefinition<JobStatus> = {
  transitions: {
    [JobStatus.DRAFT]:     [JobStatus.OPEN],
    [JobStatus.OPEN]:      [JobStatus.ON_HOLD, JobStatus.FILLED, JobStatus.CANCELLED],
    [JobStatus.ON_HOLD]:   [JobStatus.OPEN, JobStatus.CANCELLED],
    [JobStatus.FILLED]:    [JobStatus.ARCHIVED],
    [JobStatus.CANCELLED]: [JobStatus.ARCHIVED],
    [JobStatus.ARCHIVED]:  [],  // terminal
  },
  terminal: [JobStatus.ARCHIVED],
};

// ── Vendor lifecycle ──────────────────────────────────────────────────────────
// PROSPECT → ACTIVE/BLOCKED
// ACTIVE ↔ INACTIVE, ACTIVE → BLOCKED
// INACTIVE → ACTIVE/BLOCKED
// BLOCKED → ARCHIVED (terminal; sets deletedAt via service side-effect)
export const VENDOR_FSM: FsmDefinition<VendorStatus> = {
  transitions: {
    [VendorStatus.PROSPECT]:  [VendorStatus.ACTIVE, VendorStatus.BLOCKED],
    [VendorStatus.ACTIVE]:    [VendorStatus.INACTIVE, VendorStatus.BLOCKED],
    [VendorStatus.INACTIVE]:  [VendorStatus.ACTIVE, VendorStatus.BLOCKED],
    [VendorStatus.BLOCKED]:   [VendorStatus.ARCHIVED],
    [VendorStatus.ARCHIVED]:  [],
  },
  terminal: [VendorStatus.ARCHIVED],
};

// ── Submission lifecycle ───────────────────────────────────────────────────────
//
// Full 11-state pipeline FSM.
//
// Forward path:
//   DRAFT → SUBMITTED → UNDER_REVIEW → SHORTLISTED → INTERVIEW → OFFERED → PLACED
//
// From any active (non-terminal) state:
//   → REJECTED   (client rejection at any stage)
//   → WITHDRAWN  (candidate or recruiter withdrawal)
//   → ON_HOLD    (pause without losing stage context)
//
// ON_HOLD resumes to any active state (recruiter decides which stage to re-enter).
//
// Terminal states (no outbound transitions): PLACED, REJECTED, WITHDRAWN, CLOSED
// PLACED / REJECTED / WITHDRAWN → CLOSED allowed to explicitly close the record.
export const SUBMISSION_FSM: FsmDefinition<SubmissionStatus> = {
  transitions: {
    [SubmissionStatus.DRAFT]: [
      SubmissionStatus.SUBMITTED,
      SubmissionStatus.WITHDRAWN,
    ],
    [SubmissionStatus.SUBMITTED]: [
      SubmissionStatus.UNDER_REVIEW,
      SubmissionStatus.REJECTED,
      SubmissionStatus.WITHDRAWN,
      SubmissionStatus.ON_HOLD,
    ],
    [SubmissionStatus.UNDER_REVIEW]: [
      SubmissionStatus.SHORTLISTED,
      SubmissionStatus.REJECTED,
      SubmissionStatus.WITHDRAWN,
      SubmissionStatus.ON_HOLD,
    ],
    [SubmissionStatus.SHORTLISTED]: [
      SubmissionStatus.INTERVIEW,
      SubmissionStatus.REJECTED,
      SubmissionStatus.WITHDRAWN,
      SubmissionStatus.ON_HOLD,
    ],
    [SubmissionStatus.INTERVIEW]: [
      SubmissionStatus.OFFERED,
      SubmissionStatus.REJECTED,
      SubmissionStatus.WITHDRAWN,
      SubmissionStatus.ON_HOLD,
    ],
    [SubmissionStatus.OFFERED]: [
      SubmissionStatus.PLACED,
      SubmissionStatus.REJECTED,
      SubmissionStatus.WITHDRAWN,
      SubmissionStatus.ON_HOLD,
    ],
    [SubmissionStatus.ON_HOLD]: [
      SubmissionStatus.SUBMITTED,
      SubmissionStatus.UNDER_REVIEW,
      SubmissionStatus.SHORTLISTED,
      SubmissionStatus.INTERVIEW,
      SubmissionStatus.OFFERED,
      SubmissionStatus.REJECTED,
      SubmissionStatus.WITHDRAWN,
    ],
    // Terminal states — with optional CLOSED transition
    [SubmissionStatus.PLACED]:    [SubmissionStatus.CLOSED],
    [SubmissionStatus.REJECTED]:  [SubmissionStatus.CLOSED],
    [SubmissionStatus.WITHDRAWN]: [SubmissionStatus.CLOSED],
    [SubmissionStatus.CLOSED]:    [],
  },
  terminal: [SubmissionStatus.CLOSED],
};

// ── Interview lifecycle ────────────────────────────────────────────────────────
//
// Each Interview record represents one round of a submission's interview process.
//
// Forward path (typical):
//   SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED → FEEDBACK_PENDING → PASSED | FAILED
//
// Rescheduling path (new Interview record is created; original stays for history):
//   SCHEDULED | CONFIRMED → RESCHEDULED → CONFIRMED
//
// No-show path (candidate/interviewer didn't appear):
//   SCHEDULED | CONFIRMED | RESCHEDULED | IN_PROGRESS → NO_SHOW → RESCHEDULED | CANCELLED
//
// Cancellation (from any active state):
//   any → CANCELLED
//
// Terminal states: PASSED, FAILED, CANCELLED
// Note: PASSED/FAILED do NOT auto-advance the Submission — recruiter retains control.
export const INTERVIEW_FSM: FsmDefinition<InterviewStatus> = {
  transitions: {
    [InterviewStatus.SCHEDULED]: [
      InterviewStatus.CONFIRMED,
      InterviewStatus.RESCHEDULED,
      InterviewStatus.NO_SHOW,
      InterviewStatus.CANCELLED,
    ],
    [InterviewStatus.CONFIRMED]: [
      InterviewStatus.IN_PROGRESS,
      InterviewStatus.RESCHEDULED,
      InterviewStatus.NO_SHOW,
      InterviewStatus.CANCELLED,
    ],
    [InterviewStatus.RESCHEDULED]: [
      InterviewStatus.CONFIRMED,
      InterviewStatus.CANCELLED,
    ],
    [InterviewStatus.IN_PROGRESS]: [
      InterviewStatus.COMPLETED,
      InterviewStatus.NO_SHOW,
      InterviewStatus.CANCELLED,
    ],
    [InterviewStatus.COMPLETED]: [
      InterviewStatus.FEEDBACK_PENDING,
    ],
    [InterviewStatus.FEEDBACK_PENDING]: [
      InterviewStatus.PASSED,
      InterviewStatus.FAILED,
    ],
    [InterviewStatus.NO_SHOW]: [
      InterviewStatus.RESCHEDULED,
      InterviewStatus.CANCELLED,
    ],
    // Terminal states
    [InterviewStatus.PASSED]:    [],
    [InterviewStatus.FAILED]:    [],
    [InterviewStatus.CANCELLED]: [],
  },
  terminal: [InterviewStatus.PASSED, InterviewStatus.FAILED, InterviewStatus.CANCELLED],
};
