/**
 * Frontend telemetry shim — TF-1-8.
 *
 * Mirror of the backend shim. No-op today; ready for @sentry/nextjs +
 * @opentelemetry/sdk-trace-web when those packages land.
 *
 * The browser SDK switch is simpler than backend:
 *   1. `pnpm add @sentry/nextjs`
 *   2. Run `npx @sentry/wizard@latest -i nextjs` for the boilerplate.
 *   3. Replace the no-op bodies below with Sentry calls.
 *
 * Web Vitals (LCP, CLS, INP) are captured here independently. When
 * Sentry lands they auto-forward; until then we keep them in memory
 * for the in-app /debug page (Phase 7).
 */

export const telemetry = {
  /** Capture an exception. */
  recordException(err: unknown, tags?: Record<string, string>): void {
    if (process.env.NODE_ENV !== 'production') {
      // Surface in dev console so developers see the trace.
      // eslint-disable-next-line no-console
      console.error('[telemetry] exception', err, tags);
    }
    // SDK switch: Sentry.captureException(err, { tags });
  },

  /** Mark a UX event for diagnostics — page nav, drawer open, etc. */
  recordEvent(name: string, attrs?: Record<string, string | number | boolean>): void {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[telemetry]', name, attrs);
    }
    // SDK switch: Sentry.addBreadcrumb({ category: 'event', message: name, data: attrs });
  },

  /** Set the active user context (after auth resolves). */
  setUser(user: { id: string; orgId: string; role?: string }): void {
    // SDK switch: Sentry.setUser({ id: user.id }); Sentry.setTag('tenant', user.orgId);
    void user;
  },

  /** Web Vitals hook — call from next/web-vitals. */
  reportWebVital(metric: { name: string; value: number; id: string }): void {
    // SDK switch: Sentry.metrics.distribution(`web_vital.${metric.name}`, metric.value)
    void metric;
  },
};
