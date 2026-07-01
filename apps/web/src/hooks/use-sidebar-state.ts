'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Persisted sidebar-collapsed state. Reads from localStorage on mount;
 * subsequent toggles write through. SSR-safe: initial value is always
 * `false` on the server; a hydration effect syncs from localStorage.
 */

const STORAGE_KEY = 'tf.sidebar.collapsed';

export function useSidebarState(): {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
} {
  const [collapsed, setCollapsedState] = useState<boolean>(false);

  // Hydrate from localStorage. Runs once on mount (client only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === 'true') setCollapsedState(true);
    } catch {
      // localStorage inaccessible (SSR shim, private-browsing quota).
      // Fall back to default expanded.
    }
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try { window.localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false'); } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { collapsed, toggle, setCollapsed };
}
