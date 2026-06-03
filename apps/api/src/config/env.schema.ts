import { z } from 'zod';

/**
 * Zod schema for all environment variables.
 *
 * Rules:
 * - Required vars without defaults MUST be set in all environments.
 * - Vars with defaults are safe to omit in development.
 * - JWT secrets use .min(32) — anything shorter is rejected immediately.
 *   Production deployments should use ≥64 chars generated via: openssl rand -base64 64
 */
export const envSchema = z.object({
  // ─── Application ──────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_PREFIX: z.string().min(1).default('api'),

  // ─── Database ─────────────────────────────────────────────────────────────
  // Default provided so the app can start without .env in a fresh checkout.
  // In production these MUST be overridden with real values.
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://postgres:postgres@localhost:5432/recruitment_dev?schema=public'),

  // ─── Cache / Queue ────────────────────────────────────────────────────────
  REDIS_URL:     z.string().min(1).default('redis://localhost:6379'),
  // Set to true when Redis is running (docker-compose or local install).
  // false = BullMQ module is skipped; API boots without Redis.
  // z.coerce.boolean() is intentionally avoided: Boolean('false') === true in JS,
  // which would activate Redis when REDIS_ENABLED=false is set in .env.
  REDIS_ENABLED: z.string().default('false').transform(s => s === 'true' || s === '1'),

  // ─── File Storage ─────────────────────────────────────────────────────────
  // STORAGE_DRIVER=local  → filesystem (dev, default)
  // STORAGE_DRIVER=s3     → AWS S3 (production)
  STORAGE_DRIVER:        z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH:    z.string().min(1).default('./uploads'),
  STORAGE_MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(100).default(10),

  // ─── CORS ─────────────────────────────────────────────────────────────────
  // Comma-separated origins: "https://app.example.com,https://admin.example.com"
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),

  // ─── Authentication ───────────────────────────────────────────────────────
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters — use openssl rand -base64 64 in prod'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // ─── Logging ──────────────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // ─── Application URL ──────────────────────────────────────────────────────
  // Public URL of the frontend, used to build absolute links in emails
  // (invitation accept links, password reset, etc.).
  APP_URL: z.string().url().default('http://localhost:3000'),

  // ─── Email delivery ───────────────────────────────────────────────────────
  // console  -> logs to stdout and writes .eml files under STORAGE_LOCAL_PATH/emails/
  //             (zero-config dev default — no SMTP server needed)
  // smtp     -> nodemailer-backed SMTP (works for prod with SES/Mailgun/Postfix/etc.)
  // sendgrid -> stub; throws "not implemented" until enabled
  // postmark -> stub; throws "not implemented" until enabled
  EMAIL_DRIVER: z.enum(['console', 'smtp', 'sendgrid', 'postmark']).default('console'),

  // Sender identity used by all outbound mail.
  EMAIL_FROM_ADDRESS: z.string().email().default('no-reply@recruitment.local'),
  EMAIL_FROM_NAME:    z.string().min(1).default('Recruitment Platform'),

  // SMTP — only required when EMAIL_DRIVER=smtp.
  SMTP_HOST:     z.string().optional(),
  SMTP_PORT:     z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE:   z.string().default('false').transform(s => s === 'true' || s === '1'),
  SMTP_USER:     z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // Worker concurrency for the email queue. Higher = more parallel SMTP calls;
  // keep modest to stay under SMTP provider rate limits.
  EMAIL_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(4),

  // Dedup window for EmailService.send when an idempotencyKey is provided.
  // Within this window, a same-key send in non-terminal state short-circuits
  // to the existing delivery row (no second email goes out).
  EMAIL_DEDUP_WINDOW_SECONDS: z.coerce.number().int().min(10).max(86_400).default(300),
}).superRefine((env, ctx) => {
  // ─── Production hardening (Pre-Phase-1, per architecture review) ────────
  // In development, REDIS_ENABLED=false is acceptable: queue modules become
  // no-ops and ingest paths fall back to synchronous execution so a fresh
  // checkout works without Redis. That convenience is unacceptable in
  // production: a "sync fallback" silently degrades latency (parsing
  // blocks the request thread for 10+ seconds) and breaks every assumption
  // about retries, DLQ, and observability.
  //
  // Fail-fast at boot when NODE_ENV=production unless Redis is wired.
  if (env.NODE_ENV === 'production' && env.REDIS_ENABLED !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REDIS_ENABLED'],
      message:
        'REDIS_ENABLED must be true in production. ' +
        'The dev-only sync fallback is unsafe for customer traffic — ' +
        'parsing jobs would block request threads and have no retry path. ' +
        'Provision Redis and set REDIS_ENABLED=true before deploying.',
    });
  }

  // JWT secrets in production must be substantially longer than the
  // 32-char dev floor.
  if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 64) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_SECRET'],
      message:
        'JWT_SECRET must be ≥ 64 characters in production. ' +
        'Generate via: openssl rand -base64 64',
    });
  }
});

export type EnvConfig = z.infer<typeof envSchema>;
