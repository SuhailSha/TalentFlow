'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import {
  addSubmissionNote,
  changeSubmissionStatus,
  createSubmission,
  deleteSubmission,
  getSubmission,
  getSubmissionStats,
  listSubmissions,
  updateSubmission,
} from '@/lib/api/submissions';
import type {
  ChangeStatusDto,
  CreateSubmissionDto,
  CreateSubmissionNoteDto,
  ListSubmissionsParams,
  UpdateSubmissionDto,
} from '@/types/submissions';

// ── Query key factory ──────────────────────────────────────────────────────────

export const submissionKeys = {
  all:     ['submissions']                  as const,
  lists:   ()                               => [...submissionKeys.all, 'list']         as const,
  list:    (p: ListSubmissionsParams)       => [...submissionKeys.lists(), p]          as const,
  details: ()                               => [...submissionKeys.all, 'detail']       as const,
  detail:  (id: string)                     => [...submissionKeys.details(), id]       as const,
  stats:   ()                               => [...submissionKeys.all, 'stats']        as const,
};

// ── Query hooks ───────────────────────────────────────────────────────────────

export function useSubmissions(params: ListSubmissionsParams = {}) {
  return useQuery({
    queryKey: submissionKeys.list(params),
    queryFn:  () => listSubmissions(params),
  });
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: submissionKeys.detail(id),
    queryFn:  () => getSubmission(id),
    enabled:  !!id,
  });
}

export function useSubmissionStats() {
  return useQuery({
    queryKey: submissionKeys.stats(),
    queryFn:  () => getSubmissionStats(),
  });
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useCreateSubmission() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateSubmissionDto) => createSubmission(dto),
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: submissionKeys.stats() });
      router.push(`/submissions/${submission.id}`);
    },
  });
}

export function useUpdateSubmission(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateSubmissionDto) => updateSubmission(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });
    },
  });
}

export function useChangeSubmissionStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ChangeStatusDto) => changeSubmissionStatus(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: submissionKeys.stats() });
    },
  });
}

export function useAddSubmissionNote(submissionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateSubmissionNoteDto) =>
      addSubmissionNote(submissionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.detail(submissionId) });
    },
  });
}

export function useDeleteSubmission() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSubmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: submissionKeys.stats() });
      router.push('/submissions');
    },
  });
}
