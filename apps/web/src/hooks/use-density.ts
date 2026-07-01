'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * User-facing density preference. Persists to localStorage; SSR-safe
 * initial value is `comfortable`.
 *
 * Applied by:
 *   - DataTable (TF-2-1): row height + cell padding
 *   - Workspace surfaces: card padding on dense layouts
 *   - Inbox rows: line-clamp count + row height
 */

export type Density = 'cozy' | 'comfortable' | 'compact';

const STORAGE_KEY = 'tf.density';

export function useDensity(): {
  density: Density;
  setDensity: (d: Density) => void;
} {
  const [density, setInternal] = useState<Density>('comfortable');

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === 'cozy' || v === 'compact' || v === 'comfortable') {
        setInternal(v);
      }
    } catch { /* SSR / private-browsing / quota */ }
  }, []);

  const setDensity = useCallback((d: Density) => {
    setInternal(d);
    try { window.localStorage.setItem(STORAGE_KEY, d); } catch { /* ignore */ }
    // Broadcast so unrelated components on the page can react without a
    // rerender roundtrip. Fired only on client.
    try { window.dispatchEvent(new CustomEvent('tf:density-change', { detail: d })); } catch { /* ignore */ }
  }, []);

  return { density, setDensity };
}
