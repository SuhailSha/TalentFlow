/**
 * Queue name registry — all BullMQ queue names must be declared here.
 *
 * Naming convention: kebab-case, domain-prefixed
 *   resume-parse       — AI resume parsing pipeline (Phase 2)
 *   notification-email — Outbound email sending (Phase 4)
 *   notification-push  — In-app push notifications (Phase 4)
 *   report-generate    — Async report generation (Phase 5)
 *   cleanup-scheduled  — Periodic maintenance tasks
 *
 * Each queue name must have a matching QUEUE_TOKENS entry for DI injection.
 */
export const QUEUE_NAMES = {
  RESUME_PARSE:        'resume-parse',
  NOTIFICATION_EMAIL:  'notification-email',
  NOTIFICATION_PUSH:   'notification-push',
  REPORT_GENERATE:     'report-generate',
  CLEANUP_SCHEDULED:   'cleanup-scheduled',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

/**
 * Job type registry — typed job names per queue.
 *
 * Convention: UPPER_SNAKE_CASE within each queue namespace.
 * Workers use these constants in their process() switch statements.
 */
export const JOB_NAMES = {
  // resume-parse queue
  RESUME_PARSE_OCR:        'RESUME_PARSE_OCR',
  RESUME_PARSE_EXTRACT:    'RESUME_PARSE_EXTRACT',
  RESUME_PARSE_NORMALISE:  'RESUME_PARSE_NORMALISE',

  // notification-email queue
  EMAIL_SEND:              'EMAIL_SEND',
  EMAIL_BULK:              'EMAIL_BULK',

  // notification-push queue
  PUSH_SEND:               'PUSH_SEND',

  // report-generate queue
  REPORT_PIPELINE_SUMMARY: 'REPORT_PIPELINE_SUMMARY',
  REPORT_RECRUITER_PERF:   'REPORT_RECRUITER_PERF',

  // cleanup-scheduled queue
  CLEANUP_EXPIRED_TOKENS:  'CLEANUP_EXPIRED_TOKENS',
  CLEANUP_STALE_SESSIONS:  'CLEANUP_STALE_SESSIONS',
} as const;

export type JobName = typeof JOB_NAMES[keyof typeof JOB_NAMES];

/**
 * Default retry configuration shared across all queues.
 *
 * Exponential back-off: 1s → 2s → 4s → 8s → 16s (5 attempts max).
 * After exhausting retries, the job moves to the queue's failed set
 * (the "dead letter" in BullMQ terminology).
 *
 * Per-job overrides are applied at `queue.add()` call sites.
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 1_000,
  },
  removeOnComplete: {
    age:   7 * 24 * 3600, // keep completed jobs for 7 days
    count: 1_000,          // but at most 1 000 entries
  },
  removeOnFail: {
    age:   30 * 24 * 3600, // keep failed jobs for 30 days for forensics
    count: 5_000,
  },
} as const;

/**
 * AI-specific job options — longer timeout, fewer retries.
 * LLM calls can take 30+ seconds; exponential back-off would delay too long.
 */
export const AI_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'fixed' as const,
    delay: 5_000,
  },
  removeOnComplete: { age: 7 * 24 * 3600, count: 500 },
  removeOnFail:     { age: 30 * 24 * 3600, count: 1_000 },
} as const;
