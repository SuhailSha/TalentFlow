'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';

import { fetchFlags } from '@/lib/feature-flags/client';
import { FLAG_DEFAULTS, type FlagKey } from '@/lib/feature-flags/flag-catalog';

// Single React Query key for all flags. We refetch on tenant switch
// (handled separately) but not on every page navigation.
const FLAGS_QUERY_KEY = ['feature-flags'] as const;

interface FlagsContextValue {
  flags:  Record<FlagKey, boolean>;
  /** Always-safe synchronous lookup; falls back to catalog default. */
  isOn:   (key: FlagKey) => boolean;
  /** Loading on first fetch (subsequent refetches don't flip this). */
  isLoading: boolean;
}

const FlagsContext = createContext<FlagsContextValue | null>(null);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { data: flags = FLAG_DEFAULTS, isLoading } = useQuery({
    queryKey:  FLAGS_QUERY_KEY,
    queryFn:   fetchFlags,
    // Flags rarely change within a session. 5 min stale window is plenty.
    staleTime: 5 * 60 * 1_000,
    // Refetch on window focus so a deploy that flipped a flag is picked
    // up without a full reload.
    refetchOnWindowFocus: true,
  });

  const value: FlagsContextValue = {
    flags,
    isOn: (key) => flags[key] ?? FLAG_DEFAULTS[key] ?? false,
    isLoading,
  };

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

/**
 * Typed flag hook. Synchronous; safe to use anywhere in a component
 * tree below FeatureFlagsProvider.
 *
 * @example
 *   const reportsOn = useFlag(FLAG_KEYS.REPORTS_MODULE);
 *   if (!reportsOn) return null;
 */
export function useFlag(key: FlagKey): boolean {
  const ctx = useContext(FlagsContext);
  if (!ctx) {
    // Conservative default before the provider mounts.
    return FLAG_DEFAULTS[key] ?? false;
  }
  return ctx.isOn(key);
}

export function useFeatureFlags(): FlagsContextValue {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  return ctx;
}
