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

  // ── Resume domain ───────────────────────────────────────────────────────────
  RESUME_UPLOAD_REQUESTED: 'resume.upload_requested',
  RESUME_PARSE_REQUESTED:  'resume.parse_requested',
  RESUME_PARSE_COMPLETED:  'resume.parse_completed',
  RESUME_PARSE_FAILED:     'resume.parse_failed',
  RESUME_REVIEW_REQUIRED:  'resume.review_required',
  RESUME_REVIEW_CLAIMED:   'resume.review_claimed',
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

  // ── Submission domain ────────────────────────────────────────────────────────
  SUBMISSION_CREATED:        'submission.created',
  SUBMISSION_UPDATED:        'submission.updated',
  SUBMISSION_DELETED:        'submission.deleted',
  SUBMISSION_STATUS_CHANGED: 'submission.status_changed',
  SUBMISSION_NOTE_ADDED:     'submission.note_added',
  SUBMISSION_OWNER_CHANGED:  'submission.owner_changed',
  OFFER_EXTENDED:            'submission.offer_extended',  // status → OFFERED
  CANDIDATE_PLACED:          'submission.candidate_placed', // status → PLACED

  // ── Interview domain ─────────────────────────────────────────────────────────
  INTERVIEW_SCHEDULED:       'interview.scheduled',
  INTERVIEW_UPDATED:         'interview.updated',
  INTERVIEW_CANCELLED:       'interview.cancelled',
  INTERVIEW_STATUS_CHANGED:  'interview.status_changed',
  INTERVIEW_NOTE_ADDED:      'interview.note_added',
  INTERVIEW_FEEDBACK_SUBMITTED: 'interview.feedback_submitted',
  INTERVIEW_PASSED:          'interview.passed',
  INTERVIEW_FAILED:          'interview.failed',
  INTERVIEW_NO_SHOW:         'interview.no_show',

  // ── Reminders domain ─────────────────────────────────────────────────────────
  REMINDER_CREATED:      'reminder.created',
  REMINDER_UPDATED:      'reminder.updated',
  REMINDER_ACKNOWLEDGED: 'reminder.acknowledged',
  REMINDER_SNOOZED:      'reminder.snoozed',
  REMINDER_COMPLETED:    'reminder.completed',
  REMINDER_DISMISSED:    'reminder.dismissed',
  REMINDER_OVERDUE:      'reminder.overdue',   // fired by future scheduled job

  // ── Notifications domain ──────────────────────────────────────────────────────
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ:    'notification.read',

  // ── Organization / User / Invitation domain ──────────────────────────────────
  ORG_UPDATED:             'org.updated',
  ORG_SETTINGS_UPDATED:    'org.settings_updated',
  USER_INVITED:            'user.invited',
  USER_INVITATION_ACCEPTED: 'user.invitation_accepted',
  USER_INVITATION_REVOKED: 'user.invitation_revoked',
  USER_ACTIVATED:          'user.activated',
  USER_DEACTIVATED:        'user.deactivated',
  USER_ROLE_ASSIGNED:      'user.role_assigned',
  USER_ROLE_REMOVED:       'user.role_removed',
  USER_PROFILE_UPDATED:    'user.profile_updated',
  ROLE_CREATED:            'role.created',
  ROLE_UPDATED:            'role.updated',
  ROLE_DELETED:            'role.deleted',
  SUBSCRIPTION_UPDATED:    'subscription.updated',

  // ── System / platform ───────────────────────────────────────────────────────
  AUTH_LOGIN:              'auth.login',
  AUTH_LOGOUT:             'auth.logout',
  AUTH_REFRESH:            'auth.refresh',
  AUTH_LOGIN_FAILED:       'auth.login_failed',
} as const;

export type EventName = typeof EventNames[keyof typeof EventNames];
