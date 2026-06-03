'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assignCandidateOwner,
  getCandidateWorkspace,
} from '@/lib/api/candidate-workspace';

import { candidateKeys } from './use-candidates';

export const candidateWorkspaceKeys = {
  all:    ['candidate-workspace'] as const,
  detail: (id: string) => [...candidateWorkspaceKeys.all, id] as const,
};

export function useCandidateWorkspace(id: string | undefined) {
  return useQuery({
    queryKey:  candidateWorkspaceKeys.detail(id ?? ''),
    queryFn:   () => getCandidateWorkspace(id!),
    enabled:   !!id,
    staleTime: 30_000,
  });
}

// ── Owner reassignment ──────────────────────────────────────────────────────
// Cache invalidation covers both the workspace aggregate and the underlying
// candidate detail so any consumer (header, owner card, list view) refreshes.

export function useAssignCandidateOwner(candidateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ownerId: string | null) => assignCandidateOwner(candidateId, ownerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateWorkspaceKeys.detail(candidateId) });
      queryClient.invalidateQueries({ queryKey: candidateKeys.detail(candidateId) });
      queryClient.invalidateQueries({ queryKey: candidateKeys.lists() });
    },
  });
}
