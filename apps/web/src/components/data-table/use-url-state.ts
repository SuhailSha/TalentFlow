'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/**
 * URL-state helper for the DataTable — TF-2-1.
 *
 * The table reflects sort, filters, pagination, and active saved view
 * into the URL's search params so:
 *   - refresh preserves the view,
 *   - a shared link reproduces exactly what the sender saw,
 *   - back/forward navigation is meaningful.
 *
 * Consumers name their own keys via the `namespace` argument
 * (e.g., namespace='c' for candidates → `?c.sort=lastName:desc`).
 * Different tables on the same route can coexist because their keys
 * are prefixed.
 *
 * State shape is `Record<string, string>` so it round-trips URL cleanly.
 * Booleans and numbers serialize as strings; consumers decode.
 */
export function useUrlState(namespace: string): {
  read:  <T = Record<string, string>>() => T;
  write: (patch: Record<string, string | null>) => void;
  clear: () => void;
} {
  const router = useRouter();
  const params = useSearchParams();

  const prefix = `${namespace}.`;

  const read = useCallback(<T = Record<string, string>>(): T => {
    const out: Record<string, string> = {};
    if (!params) return out as T;
    for (const [k, v] of params.entries()) {
      if (k.startsWith(prefix)) {
        out[k.slice(prefix.length)] = v;
      }
    }
    return out as T;
  }, [params, prefix]);

  const write = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params?.toString() ?? '');
    for (const [k, v] of Object.entries(patch)) {
      const fullKey = `${prefix}${k}`;
      if (v === null || v === '') {
        next.delete(fullKey);
      } else {
        next.set(fullKey, v);
      }
    }
    const q = next.toString();
    // replace, not push: the table's routine sort/filter clicks are not
    // history-worthy events. Consumers use push explicitly for saved-
    // view selections if they want history entries.
    router.replace(q ? `?${q}` : '?', { scroll: false });
  }, [params, router, prefix]);

  const clear = useCallback(() => {
    const next = new URLSearchParams(params?.toString() ?? '');
    for (const k of Array.from(next.keys())) {
      if (k.startsWith(prefix)) next.delete(k);
    }
    router.replace(next.toString() ? `?${next.toString()}` : '?', { scroll: false });
  }, [params, router, prefix]);

  return useMemo(() => ({ read, write, clear }), [read, write, clear]);
}
