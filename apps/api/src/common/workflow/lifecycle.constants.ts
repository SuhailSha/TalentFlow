import { CandidateStatus, JobStatus } from '@repo/database';

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

// ── Submission lifecycle (placeholder — implemented with SubmissionsModule) ────
// SUBMITTED → SCREENING → INTERVIEW → OFFER → HIRED (terminal)
//         ↘ REJECTED (terminal, reachable from any non-terminal state)
export type SubmissionStatus =
  | 'SUBMITTED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED';

export const SUBMISSION_FSM: FsmDefinition<SubmissionStatus> = {
  transitions: {
    SUBMITTED:  ['SCREENING',  'REJECTED'],
    SCREENING:  ['INTERVIEW',  'REJECTED'],
    INTERVIEW:  ['OFFER',      'REJECTED'],
    OFFER:      ['HIRED',      'REJECTED'],
    HIRED:      [],
    REJECTED:   [],
  },
  terminal: ['HIRED', 'REJECTED'],
};
