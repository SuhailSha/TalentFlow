'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import {
  addInterviewFeedback,
  addInterviewNote,
  addInterviewParticipant,
  changeInterviewStatus,
  deleteInterview,
  getInterview,
  getInterviewStats,
  listInterviews,
  removeInterviewParticipant,
  scheduleInterview,
  submitInterviewFeedback,
  updateInterview,
  updateInterviewFeedback,
} from '@/lib/api/interviews';
import type {
  AddParticipantDto,
  ChangeInterviewStatusDto,
  CreateFeedbackDto,
  CreateInterviewNoteDto,
  ListInterviewsParams,
  ScheduleInterviewDto,
  UpdateInterviewDto,
} from '@/types/interviews';

// ── Query key factory ──────────────────────────────────────────────────────────

export const interviewKeys = {
  all:     ['interviews']                 as const,
  lists:   ()                            => [...interviewKeys.all, 'list']         as const,
  list:    (p: ListInterviewsParams)     => [...interviewKeys.lists(), p]          as const,
  details: ()                            => [...interviewKeys.all, 'detail']       as const,
  detail:  (id: string)                  => [...interviewKeys.details(), id]       as const,
  stats:   ()                            => [...interviewKeys.all, 'stats']        as const,
};

// ── Query hooks ───────────────────────────────────────────────────────────────

export function useInterviews(params: ListInterviewsParams = {}) {
  return useQuery({
    queryKey: interviewKeys.list(params),
    queryFn:  () => listInterviews(params),
  });
}

export function useInterview(id: string) {
  return useQuery({
    queryKey: interviewKeys.detail(id),
    queryFn:  () => getInterview(id),
    enabled:  !!id,
  });
}

export function useInterviewStats() {
  return useQuery({
    queryKey: interviewKeys.stats(),
    queryFn:  () => getInterviewStats(),
  });
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useScheduleInterview() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ScheduleInterviewDto) => scheduleInterview(dto),
    onSuccess: (interview) => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: interviewKeys.stats() });
      router.push(`/interviews/${interview.id}`);
    },
  });
}

export function useUpdateInterview(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateInterviewDto) => updateInterview(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() });
    },
  });
}

export function useChangeInterviewStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ChangeInterviewStatusDto) => changeInterviewStatus(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: interviewKeys.stats() });
    },
  });
}

export function useAddInterviewNote(interviewId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateInterviewNoteDto) => addInterviewNote(interviewId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.detail(interviewId) });
    },
  });
}

export function useAddInterviewFeedback(interviewId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateFeedbackDto) => addInterviewFeedback(interviewId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.detail(interviewId) });
    },
  });
}

export function useUpdateInterviewFeedback(interviewId: string, feedbackId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateFeedbackDto) => updateInterviewFeedback(interviewId, feedbackId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.detail(interviewId) });
    },
  });
}

export function useSubmitInterviewFeedback(interviewId: string, feedbackId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => submitInterviewFeedback(interviewId, feedbackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.detail(interviewId) });
      queryClient.invalidateQueries({ queryKey: interviewKeys.stats() });
    },
  });
}

export function useAddInterviewParticipant(interviewId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AddParticipantDto) => addInterviewParticipant(interviewId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.detail(interviewId) });
    },
  });
}

export function useRemoveInterviewParticipant(interviewId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (participantId: string) =>
      removeInterviewParticipant(interviewId, participantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.detail(interviewId) });
    },
  });
}

export function useDeleteInterview() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInterview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: interviewKeys.stats() });
      router.push('/interviews');
    },
  });
}
