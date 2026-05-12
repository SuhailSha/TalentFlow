/**
 * Per-item outcome of a bulk operation.
 *
 * `ok: true`  -> handler succeeded for this id; `data` carries the result
 *                (may be omitted when the operation is fire-and-forget)
 * `ok: false` -> handler failed (or the id wasn't authorized); `error`
 *                carries a recruiter-readable message
 */
export interface BulkItemResult<T = unknown> {
  id:    string;
  ok:    boolean;
  data?: T;
  error?: string;
}

/**
 * Structured outcome of a bulk operation. Always returned even when all
 * items failed — the recruiter UI uses the per-item array to surface
 * specific failures.
 */
export interface BulkOperationResult<T = unknown> {
  totalRequested: number;
  succeeded:      number;
  failed:         number;
  results:        BulkItemResult<T>[];
}

/**
 * Standard reason text used when an id was requested but is not visible
 * to the caller's tenant or doesn't exist.
 */
export const BULK_UNAUTHORIZED_REASON =
  'Not found or not accessible in your organization';

/**
 * Max ids per bulk request. Enforced at DTO validation. Higher than this
 * should use a future async-job path; this synchronous endpoint trades
 * UX latency for safety against runaway batches.
 */
export const BULK_MAX_IDS = 200;
