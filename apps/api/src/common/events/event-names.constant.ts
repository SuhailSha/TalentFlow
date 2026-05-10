/**
 * Canonical event name registry.
 *
 * Naming convention:  <resource>.<action>
 *   resource  lowercase, dot-separated for nested resources
 *   action    past tense verb
 *
 * Examples:
 *   candidate.created
 *   candidate.updated
 *   candidate.deleted
 *   submission.stage_changed
 *   resume.parse_requested
 *   resume.parse_completed
 *
 * Rules:
 *   1. Every emitted event MUST have an entry here — no magic strings.
 *   2. Listeners use EventEmitter2 wildcards: 'candidate.*' or 'resume.**'.
 *   3. Event names are snake_case after the dot (not camelCase).
 *   4. Breaking changes to event names require a migration plan
 *      (listeners must be updated simultaneously).
 */
export const EventNames = {
  // ── Candidate domain ────────────────────────────────────────────────────────
  CANDIDATE_CREATED:        'candidate.created',
  CANDIDATE_UPDATED:        'candidate.updated',
  CANDIDATE_DELETED:        'candidate.deleted',
  CANDIDATE_STATUS_CHANGED: 'candidate.status_changed',
  CANDIDATE_NOTE_ADDED:     'candidate.note_added',
  CANDIDATE_SKILL_ADDED:    'candidate.skill_added',
  CANDIDATE_SKILL_REMOVED:  'candidate.skill_removed',

  // ── Resume domain (infrastructure ready, feature in Phase 2) ────────────────
  RESUME_UPLOAD_REQUESTED: 'resume.upload_requested',
  RESUME_PARSE_REQUESTED:  'resume.parse_requested',
  RESUME_PARSE_COMPLETED:  'resume.parse_completed',
  RESUME_PARSE_FAILED:     'resume.parse_failed',
  RESUME_REVIEW_COMPLETED: 'resume.review_completed',

  // ── Job Description domain (Phase 1B Step 4C.1) ────────────────────────────
  JOB_CREATED:             'job.created',
  JOB_UPDATED:             'job.updated',
  JOB_STATUS_CHANGED:      'job.status_changed',
  JOB_DELETED:             'job.deleted',
  JOB_NOTE_ADDED:          'job.note_added',
  JOB_SKILL_ADDED:         'job.skill_added',
  JOB_SKILL_REMOVED:       'job.skill_removed',

  // ── Vendor domain ───────────────────────────────────────────────────────────
  VENDOR_CREATED:         'vendor.created',
  VENDOR_UPDATED:         'vendor.updated',
  VENDOR_DELETED:         'vendor.deleted',
  VENDOR_STATUS_CHANGED:  'vendor.status_changed',
  VENDOR_NOTE_ADDED:      'vendor.note_added',
  VENDOR_CONTACT_ADDED:   'vendor.contact_added',
  VENDOR_CONTACT_UPDATED: 'vendor.contact_updated',
  VENDOR_CONTACT_REMOVED: 'vendor.contact_removed',

  // ── Submission domain (Phase 1B Step 4C.2 — not yet implemented) ───────────
  SUBMISSION_CREATED:      'submission.created',
  SUBMISSION_STAGE_CHANGED:'submission.stage_changed',
  OFFER_EXTENDED:          'offer.extended',
  OFFER_STATUS_CHANGED:    'offer.status_changed',

  // ── System / platform ───────────────────────────────────────────────────────
  AUTH_LOGIN:              'auth.login',
  AUTH_LOGOUT:             'auth.logout',
  AUTH_REFRESH:            'auth.refresh',
  AUTH_LOGIN_FAILED:       'auth.login_failed',
} as const;

export type EventName = typeof EventNames[keyof typeof EventNames];
