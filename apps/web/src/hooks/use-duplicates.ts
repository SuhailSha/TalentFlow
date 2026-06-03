'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deferDuplicateMatch,
  getDuplicateMatch,
  getDuplicateRun,
  getDuplicateStats,
  listDuplicateMatches,
  manualDuplicateScan,
  markNotDuplicate,
} from '@/lib/api/duplicates';
import type { ListDuplicateMatchesParams } from '@/types/duplicates';
import { reviewKeys } from './use-reviews';

export const duplicateKeys = {
  all:        ['duplicates'] as const,
  matches:    () => [...duplicateKeys.all, 'matches'] as const,
  match:      (id: string) => [...duplicateKeys.all, 'match', id] as const,
  matchList:  (params: ListDuplicateMatchesParams) =>
    [...duplicateKeys.matches(), params] as const,
  runs:       () => [...duplicateKeys.all, 'runs'] as const,
  run:        (id: string) => [...duplicateKeys.runs(), id] as const,
  stats:      () => [...duplicateKeys.all, 'stats'] as const,
};

export function useDuplicateMatches(params: ListDuplicateMatchesParams = {}) {
  return useQuery({
    queryKey: duplicateKeys.matchList(params),
    queryFn:  () => listDuplicateMatches(params),
  });
}

export function useDuplicateMatch(id: string | null | undefined) {
  return useQuery({
    queryKey: duplicateKeys.match(id ?? ''),
    queryFn:  () => getDuplicateMatch(id!),
    enabled:  !!id,
  });
}

export function useDuplicateRun(id: string | null | undefined) {
  return useQuery({
    queryKey: duplicateKeys.run(id ?? ''),
    queryFn:  () => getDuplicateRun(id!),
    enabled:  !!id,
  });
}

export function useDuplicateStats() {
  return useQuery({
    queryKey: duplicateKeys.stats(),
    queryFn:  () => getDuplicateStats(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarkNotDuplicate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => markNotDuplicate(id, reason),
    onSuccess:  (match) => {
      qc.setQueryData(duplicateKeys.match(id), match);
      qc.invalidateQueries({ queryKey: duplicateKeys.matches() });
      qc.invalidateQueries({ queryKey: duplicateKeys.stats() });
      qc.invalidateQueries({ queryKey: duplicateKeys.run(match.runId) });
      // The blocking review (if any) may now be ready to approve.
      qc.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}

export function useDeferDuplicateMatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notes: string | undefined) => deferDuplicateMatch(id, notes),
    onSuccess:  (match) => {
      qc.setQueryData(duplicateKeys.match(id), match);
      qc.invalidateQueries({ queryKey: duplicateKeys.matches() });
      qc.invalidateQueries({ queryKey: duplicateKeys.stats() });
      qc.invalidateQueries({ queryKey: duplicateKeys.run(match.runId) });
    },
  });
}

export function useManualDuplicateScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: string) => manualDuplicateScan(candidateId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: duplicateKeys.matches() });
      qc.invalidateQueries({ queryKey: duplicateKeys.stats() });
    },
  });
}
