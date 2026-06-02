'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveReview,
  claimReview,
  getReview,
  getReviewStats,
  listReviews,
  rejectReview,
  releaseReview,
  reparseFromReview,
  saveReviewDraft,
} from '@/lib/api/reviews';
import type {
  ApproveBody, ListReviewsParams, RejectBody, ReparseBody, SaveDraftBody,
} from '@/types/reviews';
import { candidateKeys } from './use-candidates';
import { parsingKeys } from './use-parsing';
import { resumeKeys } from './use-resumes';

export const reviewKeys = {
  all:     ['resume-reviews'] as const,
  lists:   () => [...reviewKeys.all, 'list'] as const,
  list:    (params: ListReviewsParams) => [...reviewKeys.lists(), params] as const,
  details: () => [...reviewKeys.all, 'detail'] as const,
  detail:  (id: string) => [...reviewKeys.details(), id] as const,
  stats:   () => [...reviewKeys.all, 'stats'] as const,
};

export function useReviews(params: ListReviewsParams = {}) {
  return useQuery({
    queryKey: reviewKeys.list(params),
    queryFn:  () => listReviews(params),
  });
}

export function useReview(id: string | null | undefined) {
  return useQuery({
    queryKey: reviewKeys.detail(id ?? ''),
    queryFn:  () => getReview(id!),
    enabled:  !!id,
  });
}

/** Pending-review count for the sidebar badge. Refetches every 60s. */
export function useReviewStats() {
  return useQuery({
    queryKey: reviewKeys.stats(),
    queryFn:  () => getReviewStats(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useClaimReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => claimReview(id),
    onSuccess:  (task) => {
      qc.setQueryData(reviewKeys.detail(id), task);
      qc.invalidateQueries({ queryKey: reviewKeys.lists() });
      qc.invalidateQueries({ queryKey: reviewKeys.stats() });
    },
  });
}

export function useReleaseReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => releaseReview(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: reviewKeys.detail(id) });
      qc.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}

export function useSaveReviewDraft(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveDraftBody) => saveReviewDraft(id, body),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: reviewKeys.detail(id) });
    },
  });
}

export function useApproveReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApproveBody) => approveReview(id, body),
    onSuccess:  (task) => {
      qc.setQueryData(reviewKeys.detail(id), task);
      qc.invalidateQueries({ queryKey: reviewKeys.lists() });
      qc.invalidateQueries({ queryKey: reviewKeys.stats() });
      qc.invalidateQueries({ queryKey: resumeKeys.detail(task.resumeId) });
      if (task.resultingCandidateId) {
        qc.invalidateQueries({ queryKey: candidateKeys.detail(task.resultingCandidateId) });
        qc.invalidateQueries({ queryKey: candidateKeys.lists() });
      }
    },
  });
}

export function useRejectReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RejectBody) => rejectReview(id, body),
    onSuccess:  (task) => {
      qc.setQueryData(reviewKeys.detail(id), task);
      qc.invalidateQueries({ queryKey: reviewKeys.lists() });
      qc.invalidateQueries({ queryKey: reviewKeys.stats() });
      qc.invalidateQueries({ queryKey: resumeKeys.detail(task.resumeId) });
    },
  });
}

export function useReparseFromReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReparseBody) => reparseFromReview(id, body),
    onSuccess:  (data, _body, _ctx) => {
      qc.invalidateQueries({ queryKey: reviewKeys.detail(id) });
      qc.invalidateQueries({ queryKey: reviewKeys.lists() });
      qc.invalidateQueries({ queryKey: parsingKeys.all });
      // Touch the stats so the sidebar badge refreshes.
      qc.invalidateQueries({ queryKey: reviewKeys.stats() });
      return data;
    },
  });
}
