'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteResume,
  getAccessLog,
  getResume,
  listResumes,
  updateResume,
  uploadNewVersion,
  uploadResume,
} from '@/lib/api/resumes';
import type { ListResumesParams, UpdateResumeDto, UploadResumeForm } from '@/types/resumes';
import { candidateKeys } from './use-candidates';

export const resumeKeys = {
  all:        ['resumes'] as const,
  lists:      () => [...resumeKeys.all, 'list'] as const,
  list:       (params: ListResumesParams) => [...resumeKeys.lists(), params] as const,
  details:    () => [...resumeKeys.all, 'detail'] as const,
  detail:     (id: string) => [...resumeKeys.details(), id] as const,
  accessLog:  (resumeId: string, versionId: string) =>
    [...resumeKeys.detail(resumeId), 'access-log', versionId] as const,
};

export function useResumes(params: ListResumesParams = {}) {
  return useQuery({
    queryKey: resumeKeys.list(params),
    queryFn:  () => listResumes(params),
  });
}

export function useResume(id: string | null | undefined) {
  return useQuery({
    queryKey: resumeKeys.detail(id ?? ''),
    queryFn:  () => getResume(id!),
    enabled:  !!id,
  });
}

export function useResumeAccessLog(resumeId: string, versionId: string | null | undefined) {
  return useQuery({
    queryKey: resumeKeys.accessLog(resumeId, versionId ?? ''),
    queryFn:  () => getAccessLog(resumeId, versionId!),
    enabled:  !!resumeId && !!versionId,
  });
}

export function useUploadResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: UploadResumeForm) => uploadResume(form),
    onSuccess:  (data) => {
      qc.invalidateQueries({ queryKey: resumeKeys.lists() });
      qc.invalidateQueries({ queryKey: candidateKeys.detail(data.resume.candidateId) });
      // If a draft candidate was created, refresh the candidate list too.
      if (data.draftCandidateCreated) {
        qc.invalidateQueries({ queryKey: candidateKeys.lists() });
      }
    },
  });
}

export function useUploadNewVersion(resumeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadNewVersion(resumeId, file),
    onSuccess:  (resume) => {
      qc.invalidateQueries({ queryKey: resumeKeys.detail(resumeId) });
      qc.invalidateQueries({ queryKey: resumeKeys.lists() });
      qc.invalidateQueries({ queryKey: candidateKeys.detail(resume.candidateId) });
    },
  });
}

export function useUpdateResume(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateResumeDto) => updateResume(id, dto),
    onSuccess:  (resume) => {
      qc.invalidateQueries({ queryKey: resumeKeys.detail(id) });
      qc.invalidateQueries({ queryKey: resumeKeys.lists() });
      qc.invalidateQueries({ queryKey: candidateKeys.detail(resume.candidateId) });
    },
  });
}

export function useDeleteResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteResume(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: resumeKeys.lists() });
    },
  });
}
