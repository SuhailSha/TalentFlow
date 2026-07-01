'use client';

import { useCallback, useEffect, useState } from 'react';

import type { SearchResultType } from '@/types/search';

/**
 * Track recently-visited records for the command palette's "Recent"
 * section. Stored per-user in localStorage; capped at 8 entries.
 *
 * Wired later to a server-backed store (Phase 7 `/me/recent-records`)
 * so recents survive device switches.
 */

const STORAGE_KEY = 'tf.recent-records';
const MAX_ENTRIES = 8;

export interface RecentRecord {
  id:       string;
  type:     SearchResultType;
  title:    string;
  subtitle?: string;
  href:     string;
  visitedAt: number;   // ms epoch
}

interface UseRecentRecords {
  recents: RecentRecord[];
  add:     (rec: Omit<RecentRecord, 'visitedAt'>) => void;
  clear:   () => void;
}

export function useRecentRecords(): UseRecentRecords {
  const [recents, setRecents] = useState<RecentRecord[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecents(parsed as RecentRecord[]);
      }
    } catch { /* ignore malformed */ }
  }, []);

  const persist = useCallback((list: RecentRecord[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch { /* ignore quota */ }
  }, []);

  const add = useCallback((rec: Omit<RecentRecord, 'visitedAt'>) => {
    setRecents((prev) => {
      // De-dupe by id + type. Move to top, cap.
      const filtered = prev.filter((r) => !(r.id === rec.id && r.type === rec.type));
      const next: RecentRecord[] = [
        { ...rec, visitedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_ENTRIES);
      persist(next);
      return next;
    });
  }, [persist]);

  const clear = useCallback(() => {
    setRecents([]);
    persist([]);
  }, [persist]);

  return { recents, add, clear };
}
