/**
 * Telemetry shim — TF-1-8.
 *
 * Today we don't ship the @opentelemetry/* and @sentry/node packages
 * yet (DevOps task; pnpm add to land in CI). Application code,
 * however, must already be calling the telemetry surface so when the
 * packages land, nothing else changes.
 *
 * This shim provides:
 *   - `startSpan(name, fn)` — wrap an operation in a span. No-op now;
 *     wraps OTel's `tracer.startActiveSpan` later.
 *   - `addAttributes(attrs)` — attach attributes to the current span.
 *     No-op now; wraps OTel's `trace.getActiveSpan()?.setAttributes(...)`.
 *   - `recordException(err, tags?)` — capture an exception. No-op now;
 *     calls `Sentry.captureException` + OTel span.recordException later.
 *   - `getCorrelationId()` — return the current request-id from
 *     AsyncLocalStorage. This IS implemented today; the API already
 *     plumbs request-id through pino logs.
 *
 * Migration path to real SDKs:
 *   1. `pnpm add @sentry/node @sentry/profiling-node @opentelemetry/sdk-node
 *      @opentelemetry/auto-instrumentations-node`
 *   2. Replace the no-op bodies below with the SDK calls.
 *   3. Add `initTelemetry()` to `main.ts` before AppModule bootstraps.
 *   4. No application code changes.
 *
 * Tag taxonomy (locked here so the SDK switch doesn't churn tags):
 *   - `tenant.id`             — organization id
 *   - `user.id`               — user id (for traces; never logged in PII-sensitive fields)
 *   - `request.id`            — incoming request id
 *   - `db.role`               — postgres role used (app_tenant / app_admin)
 *   - `ai.provider`           — gemini / openai / anthropic / rule-based
 *   - `ai.model`              — model id
 *   - `ai.usecase`            — prompt registry use case
 *   - `cost.usd`              — float; attach to AI spans
 *   - `prisma.admin`          — boolean; true when prismaAdmin was used (audit signal)
 */

import { AsyncLocalStorage } from 'node:async_hooks';

/** Per-request correlation context. Populated by an HTTP interceptor. */
interface CorrelationContext {
  requestId: string;
  tenantId?: string;
  userId?:   string;
}

const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export const telemetry = {
  /** Run `fn` with correlation context populated. */
  runWithCorrelation<T>(ctx: CorrelationContext, fn: () => T | Promise<T>): T | Promise<T> {
    return correlationStorage.run(ctx, fn);
  },

  /** Read the active request-id, if any. Safe to call anywhere. */
  getCorrelationId(): string | undefined {
    return correlationStorage.getStore()?.requestId;
  },

  /** Read the active tenant id, if any. */
  getActiveTenantId(): string | undefined {
    return correlationStorage.getStore()?.tenantId;
  },

  /**
   * Wrap an operation in a span. No-op shim: just runs `fn`. When OTel
   * lands, replace with `tracer.startActiveSpan(name, async (span) => {
   *   try { return await fn(); } finally { span.end(); }
   * })`.
   */
  async startSpan<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  },

  /** Add attributes to the current span. No-op shim. */
  addAttributes(_attrs: Record<string, string | number | boolean | undefined>): void {
    // SDK switch: trace.getActiveSpan()?.setAttributes(attrs)
  },

  /**
   * Capture an exception. Today: log to pino (handled by exception
   * filter). Later: forward to Sentry + attach to current OTel span.
   */
  recordException(_err: unknown, _tags?: Record<string, string>): void {
    // SDK switch: Sentry.captureException(err, { tags }); span.recordException(err)
  },

  /**
   * Mark a custom event in the trace timeline. Useful for AI calls
   * (record token + cost as event attributes), retry attempts, etc.
   */
  recordEvent(_name: string, _attrs?: Record<string, string | number | boolean>): void {
    // SDK switch: span.addEvent(name, attrs)
  },
};

/**
 * Convenience: wrap a function in correlation context + a span. Used
 * by NestJS interceptors to combine request-scope setup.
 */
export async function withRequestTelemetry<T>(
  ctx: CorrelationContext,
  spanName: string,
  fn: () => Promise<T>,
): Promise<T> {
  return correlationStorage.run(ctx, async () => {
    return telemetry.startSpan(spanName, fn);
  });
}
