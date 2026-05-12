import { toast } from 'sonner';

import type { BulkOperationResult } from '@/types/bulk';

interface NotifyOptions {
  /** Verb describing the action, e.g. "updated", "archived", "assigned". */
  verb:            string;
  /** Resource label, e.g. "submission" (singular). */
  resource:        string;
  /** Optional console-log label for debugging. Defaults to verb. */
  logLabel?:       string;
}

/**
 * Shows the right toast for a BulkOperationResult.
 *
 *  - all succeeded -> success toast: "Archived 12 submissions"
 *  - all failed     -> error toast with the first failure reason
 *  - mixed         -> warning toast: "Updated 8 of 10 submissions" with a
 *                     hint to open the dev console for per-id details
 *
 * Per-id failures are logged to console so a power user can inspect
 * exactly which ids failed and why without us building a separate
 * failure-list modal.
 */
export function notifyBulkResult(
  result: BulkOperationResult,
  opts: NotifyOptions,
): void {
  const plural = (n: number) => (n === 1 ? '' : 's');
  const r = `${opts.resource}${plural(result.totalRequested)}`;

  if (result.failed === 0) {
    toast.success(`${capitalize(opts.verb)} ${result.succeeded} ${r}`);
    return;
  }

  if (result.succeeded === 0) {
    const firstError = result.results.find((x) => !x.ok)?.error ?? 'Unknown error';
    toast.error(
      `Could not ${opts.verb} any of the ${result.totalRequested} ${r}: ${firstError}`,
    );
    logFailures(result, opts.logLabel ?? opts.verb);
    return;
  }

  toast.warning(
    `${capitalize(opts.verb)} ${result.succeeded} of ${result.totalRequested} ${r}. ${result.failed} failed — see console for details.`,
  );
  logFailures(result, opts.logLabel ?? opts.verb);
}

function logFailures(result: BulkOperationResult, label: string): void {
  if (typeof console === 'undefined') return;
  const failures = result.results.filter((r) => !r.ok);
  if (failures.length === 0) return;
  /* eslint-disable no-console */
  console.groupCollapsed(`[bulk] ${label} — ${failures.length} failure(s)`);
  for (const f of failures) {
    console.warn(`  ${f.id}: ${f.error ?? '(no error message)'}`);
  }
  console.groupEnd();
  /* eslint-enable no-console */
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
