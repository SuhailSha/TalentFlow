'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import {
  addJobNote,
  assignJobSkill,
  createJob,
  getJob,
  getJobNotes,
  listJobs,
  removeJobSkill,
  transitionJobStatus,
  updateJob,
} from '@/lib/api/jobs';
import type {
  AssignJobSkillDto,
  CreateJobDto,
  CreateJobNoteDto,
  JobStatus,
  ListJobsParams,
  UpdateJobDto,
} from '@/types/jobs';

export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (params: ListJobsParams) => [...jobKeys.lists(), params] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
  notes: (id: string) => [...jobKeys.detail(id), 'notes'] as const,
};

// ── List ──────────────────────────────────────────────────────────────────────

export function useJobs(params: ListJobsParams = {}) {
  return useQuery({
    queryKey: jobKeys.list(params),
    queryFn: () => listJobs(params),
  });
}

// ── Single ────────────────────────────────────────────────────────────────────

export function useJob(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => getJob(id),
    enabled: !!id,
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useJobNotes(id: string) {
  return useQuery({
    queryKey: jobKeys.notes(id),
    queryFn: () => getJobNotes(id),
    enabled: !!id,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateJob() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (dto: CreateJobDto) => createJob(dto),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
      router.push(`/jobs/${job.id}`);
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────────

export function useUpdateJob(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateJobDto) => updateJob(id, dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(jobKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}

// ── Status transition ─────────────────────────────────────────────────────────

export function useTransitionJobStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: JobStatus) => transitionJobStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(jobKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}

// ── Skills ────────────────────────────────────────────────────────────────────

export function useAssignJobSkill(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AssignJobSkillDto) => assignJobSkill(jobId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
    },
  });
}

export function useRemoveJobSkill(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) => removeJobSkill(jobId, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
    },
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useAddJobNote(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateJobNoteDto) => addJobNote(jobId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.notes(jobId) });
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
    },
  });
}
