'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import {
  addNote,
  assignSkill,
  createCandidate,
  deleteCandidate,
  getCandidate,
  getNotes,
  getOrCreateSkill,
  listCandidates,
  removeSkill,
  searchSkills,
  transitionCandidateStatus,
  updateCandidate,
} from '@/lib/api/candidates';
import type {
  AssignSkillDto,
  CandidateStatus,
  CreateCandidateDto,
  CreateNoteDto,
  ListCandidatesParams,
  UpdateCandidateDto,
} from '@/types/candidates';

export const candidateKeys = {
  all: ['candidates'] as const,
  lists: () => [...candidateKeys.all, 'list'] as const,
  list: (params: ListCandidatesParams) => [...candidateKeys.lists(), params] as const,
  details: () => [...candidateKeys.all, 'detail'] as const,
  detail: (id: string) => [...candidateKeys.details(), id] as const,
  notes: (id: string) => [...candidateKeys.detail(id), 'notes'] as const,
};

export const skillKeys = {
  all: ['skills'] as const,
  search: (q: string) => [...skillKeys.all, 'search', q] as const,
};

// ── List ──────────────────────────────────────────────────────────────────────

export function useCandidates(params: ListCandidatesParams = {}) {
  return useQuery({
    queryKey: candidateKeys.list(params),
    queryFn: () => listCandidates(params),
  });
}

// ── Single ────────────────────────────────────────────────────────────────────

export function useCandidate(id: string) {
  return useQuery({
    queryKey: candidateKeys.detail(id),
    queryFn: () => getCandidate(id),
    enabled: !!id,
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useCandidateNotes(id: string) {
  return useQuery({
    queryKey: candidateKeys.notes(id),
    queryFn: () => getNotes(id),
    enabled: !!id,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (dto: CreateCandidateDto) => createCandidate(dto),
    onSuccess: ({ candidate }) => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.lists() });
      router.push(`/candidates/${candidate.id}`);
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────────

export function useUpdateCandidate(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateCandidateDto) => updateCandidate(id, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(candidateKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: candidateKeys.lists() });
    },
  });
}

// ── Status transition ─────────────────────────────────────────────────────────

export function useTransitionCandidateStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: CandidateStatus) => transitionCandidateStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(candidateKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: candidateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['candidate-workspace', id] });
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) => deleteCandidate(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: candidateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: candidateKeys.lists() });
      router.push('/candidates');
    },
  });
}

// ── Skills ────────────────────────────────────────────────────────────────────

export function useAssignSkill(candidateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AssignSkillDto) => assignSkill(candidateId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.detail(candidateId) });
    },
  });
}

export function useRemoveSkill(candidateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) => removeSkill(candidateId, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.detail(candidateId) });
    },
  });
}

export function useSkillSearch(q: string) {
  return useQuery({
    queryKey: skillKeys.search(q),
    queryFn: () => searchSkills(q),
    enabled: q.length > 0,
    staleTime: 60_000,
  });
}

export function useGetOrCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => getOrCreateSkill(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useAddNote(candidateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateNoteDto) => addNote(candidateId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.notes(candidateId) });
      queryClient.invalidateQueries({ queryKey: candidateKeys.detail(candidateId) });
    },
  });
}
