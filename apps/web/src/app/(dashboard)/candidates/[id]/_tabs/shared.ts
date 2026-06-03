import type { CandidateStatus, AvailabilityStatus, NoteType } from '@/types/candidates';
import type { InterviewStatus } from '@/types/interviews';
import type { ReminderStatus } from '@/types/reminders';
import type { SubmissionStatus } from '@/types/submissions';

// Shared tone + label maps used across candidate workspace tabs.

export const STATUS_TONE: Record<CandidateStatus, string> = {
  ACTIVE:      'bg-green-100 text-green-800',
  AVAILABLE:   'bg-teal-100 text-teal-800',
  INACTIVE:    'bg-gray-100 text-gray-700',
  PLACED:      'bg-blue-100 text-blue-800',
  BLACKLISTED: 'bg-red-100 text-red-800',
};

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  ACTIVE: 'Active', AVAILABLE: 'Available', INACTIVE: 'Inactive',
  PLACED: 'Placed', BLACKLISTED: 'Blacklisted',
};

// Mirrors apps/api/src/common/workflow/lifecycle.constants.ts → CANDIDATE_FSM.
// Server-enforced; this is for menu population only.
export const CANDIDATE_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  ACTIVE:      ['INACTIVE', 'AVAILABLE', 'BLACKLISTED'],
  INACTIVE:    ['ACTIVE', 'AVAILABLE', 'BLACKLISTED'],
  AVAILABLE:   ['ACTIVE', 'INACTIVE', 'PLACED', 'BLACKLISTED'],
  PLACED:      [],
  BLACKLISTED: [],
};

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  IMMEDIATELY:  'Available now',
  TWO_WEEKS:    '2 weeks notice',
  ONE_MONTH:    '1 month notice',
  THREE_MONTHS: '3 months notice',
  NOT_LOOKING:  'Not looking',
};

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  NOTE: 'Note', CALL: 'Call', EMAIL: 'Email', MEETING: 'Meeting',
  STATUS_CHANGE: 'Status change', SYSTEM: 'System',
};

export const SUBMISSION_TONE: Record<
  SubmissionStatus,
  'gray' | 'blue' | 'amber' | 'purple' | 'indigo' | 'green' | 'red' | 'teal'
> = {
  DRAFT: 'gray', SUBMITTED: 'blue', UNDER_REVIEW: 'amber', SHORTLISTED: 'purple',
  INTERVIEW: 'indigo', OFFERED: 'amber', PLACED: 'green', REJECTED: 'red',
  WITHDRAWN: 'gray', ON_HOLD: 'amber', CLOSED: 'gray',
};

export const INTERVIEW_TONE: Record<
  InterviewStatus,
  'gray' | 'amber' | 'indigo' | 'green' | 'red' | 'blue'
> = {
  SCHEDULED: 'blue', CONFIRMED: 'indigo', RESCHEDULED: 'amber', IN_PROGRESS: 'indigo',
  COMPLETED: 'gray', FEEDBACK_PENDING: 'amber', PASSED: 'green', FAILED: 'red',
  NO_SHOW: 'red', CANCELLED: 'gray',
};

export const REMINDER_TONE: Record<ReminderStatus, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  PENDING: 'blue', ACKNOWLEDGED: 'amber', SNOOZED: 'gray',
  COMPLETED: 'green', DISMISSED: 'gray', EXPIRED: 'red',
};
