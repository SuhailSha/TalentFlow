// ─── Canonical status tone system ───────────────────────────────────────────
// One mapping per entity type. Every list, badge, and pill in the product
// resolves through this file — never hard-code `bg-amber-100` etc. in pages.
//
// Tones map to the four semantic palettes in the design system:
//   success  → emerald   (placed, approved, healthy)
//   info     → indigo    (active, scheduled, in-progress)
//   warning  → amber     (on hold, pending, attention)
//   danger   → rose      (overdue, failed, blacklisted)
//   neutral  → slate     (draft, closed, archived)
//   brand    → tenant accent (highlight states like "shortlisted")

import type { CandidateStatus } from '@/types/candidates';
import type { InterviewStatus } from '@/types/interviews';
import type { ReminderStatus } from '@/types/reminders';
import type { SubmissionStatus } from '@/types/submissions';

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'brand';

// ── Tailwind class lookup — both "filled pill" and "dot" surfaces ──────────

export const TONE_PILL: Record<StatusTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700',
  info:    'bg-info-50 text-info-700 ring-info-200 dark:bg-info-700/15 dark:text-info-200 dark:ring-info-700/40',
  success: 'bg-success-50 text-success-700 ring-success-200 dark:bg-success-700/15 dark:text-success-200 dark:ring-success-700/40',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-700/15 dark:text-warning-200 dark:ring-warning-700/40',
  danger:  'bg-danger-50 text-danger-700 ring-danger-200 dark:bg-danger-700/15 dark:text-danger-200 dark:ring-danger-700/40',
  brand:   'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-500/40',
};

export const TONE_DOT: Record<StatusTone, string> = {
  neutral: 'bg-neutral-400',
  info:    'bg-info-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger:  'bg-danger-500',
  brand:   'bg-brand-500',
};

// ── Per-entity tone maps ───────────────────────────────────────────────────

export const CANDIDATE_TONE: Record<CandidateStatus, StatusTone> = {
  ACTIVE:      'info',
  AVAILABLE:   'success',
  INACTIVE:    'neutral',
  PLACED:      'success',
  BLACKLISTED: 'danger',
};

export const SUBMISSION_TONE: Record<SubmissionStatus, StatusTone> = {
  DRAFT:        'neutral',
  SUBMITTED:    'info',
  UNDER_REVIEW: 'warning',
  SHORTLISTED:  'brand',
  INTERVIEW:    'info',
  OFFERED:      'warning',
  PLACED:       'success',
  REJECTED:     'danger',
  WITHDRAWN:    'neutral',
  ON_HOLD:      'warning',
  CLOSED:       'neutral',
};

export const INTERVIEW_TONE: Record<InterviewStatus, StatusTone> = {
  SCHEDULED:        'info',
  CONFIRMED:        'info',
  RESCHEDULED:      'warning',
  IN_PROGRESS:      'brand',
  COMPLETED:        'neutral',
  FEEDBACK_PENDING: 'warning',
  PASSED:           'success',
  FAILED:           'danger',
  NO_SHOW:          'danger',
  CANCELLED:        'neutral',
};

export const REMINDER_TONE: Record<ReminderStatus, StatusTone> = {
  PENDING:      'info',
  ACKNOWLEDGED: 'warning',
  SNOOZED:      'neutral',
  COMPLETED:    'success',
  DISMISSED:    'neutral',
  EXPIRED:      'danger',
};

// ── Job statuses (web type lives in @/types/jobs) ──────────────────────────
// Loose-typed to avoid an import cycle if job types extend later.
export const JOB_TONE: Record<string, StatusTone> = {
  DRAFT:     'neutral',
  OPEN:      'info',
  ON_HOLD:   'warning',
  FILLED:    'success',
  CANCELLED: 'danger',
  ARCHIVED:  'neutral',
};

// ── Display labels (TitleCase, used by StatusPill default label) ───────────
// Provided per-entity to avoid leaky "Filled in" or "Under_review" rendering.

export function statusLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
