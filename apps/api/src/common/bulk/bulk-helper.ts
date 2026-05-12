import { Logger } from '@nestjs/common';

import {
  BULK_UNAUTHORIZED_REASON,
  type BulkItemResult,
  type BulkOperationResult,
} from './bulk.types';

const DEFAULT_CONCURRENCY = 5;
const log = new Logger('BulkHelper');

export interface RunBulkOperationParams<T> {
  /** Unique ids the caller asked to operate on. */
  ids: string[];
  /** For log correlation only — not used for filtering. */
  organizationId: string;
  /**
   * Tenant + permission filter. Receives the requested ids and must return
   * only those the caller is authorized to act on. Ids not returned are
   * recorded as ok:false / error: BULK_UNAUTHORIZED_REASON in the result.
   */
  authorize: (ids: string[]) => Promise<string[]>;
  /**
   * Per-id handler. Throwing aborts only this id, not the batch. The
   * thrown Error.message is captured into BulkItemResult.error.
   */
  handler: (id: string) => Promise<T>;
  /** Parallel handler invocations per chunk. Default 5. */
  concurrency?: number;
}

/**
 * Generic bulk runner used by every domain's bulk service.
 *
 * Guarantees:
 *  1. Partial success — one id's failure never blocks the others.
 *  2. Tenant safety — only ids returned by authorize() get the handler call.
 *  3. Stable shape — always returns BulkOperationResult, never throws.
 *  4. Bounded concurrency — handlers run in fixed-size chunks so a bulk of
 *     200 doesn't open 200 DB connections.
 *  5. Per-id error capture — Error.message is preserved, truncated to 500.
 */
export async function runBulkOperation<T>(
  params: RunBulkOperationParams<T>,
): Promise<BulkOperationResult<T>> {
  const { ids, organizationId, authorize, handler } = params;
  const concurrency = Math.max(1, params.concurrency ?? DEFAULT_CONCURRENCY);

  // Deduplicate input — caller might pass the same id twice; we run it once.
  const unique = Array.from(new Set(ids));
  const authorizedIds = new Set(await authorize(unique));
  const unauthorized: BulkItemResult<T>[] = unique
    .filter((id) => !authorizedIds.has(id))
    .map((id) => ({ id, ok: false, error: BULK_UNAUTHORIZED_REASON }));

  const successes: BulkItemResult<T>[] = [];
  const failures:  BulkItemResult<T>[] = [];

  const toProcess = unique.filter((id) => authorizedIds.has(id));
  for (let i = 0; i < toProcess.length; i += concurrency) {
    const chunk = toProcess.slice(i, i + concurrency);
    const settled = await Promise.allSettled(chunk.map((id) => handler(id).then((data) => ({ id, data }))));
    for (let j = 0; j < settled.length; j++) {
      const idAtIndex = chunk[j];
      // Defensive: only enters this branch if our slicing was wrong (shouldn't happen).
      if (!idAtIndex) continue;
      const settledResult = settled[j];
      if (!settledResult) continue;
      if (settledResult.status === 'fulfilled') {
        successes.push({ id: settledResult.value.id, ok: true, data: settledResult.value.data });
      } else {
        const reason = settledResult.reason instanceof Error
          ? settledResult.reason.message
          : String(settledResult.reason);
        failures.push({ id: idAtIndex, ok: false, error: reason.slice(0, 500) });
      }
    }
  }

  const result: BulkOperationResult<T> = {
    totalRequested: unique.length,
    succeeded:      successes.length,
    failed:         failures.length + unauthorized.length,
    // Preserve caller-side ordering as much as possible: keep input order
    // for the results. Build a map for lookup.
    results: [],
  };
  const byId = new Map<string, BulkItemResult<T>>();
  for (const r of [...successes, ...failures, ...unauthorized]) byId.set(r.id, r);
  for (const id of unique) {
    const r = byId.get(id);
    if (r) result.results.push(r);
  }

  log.log(
    {
      organizationId,
      totalRequested: result.totalRequested,
      succeeded:      result.succeeded,
      failed:         result.failed,
    },
    'Bulk operation completed',
  );

  return result;
}
