'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelParsingJob,
  listParsingJobs,
  reparse,
} from '@/lib/api/parsing';
import type { ResumeParserProvider } from '@/types/extraction-config';
import type { ParsingJobView } from '@/types/parsing';
import { resumeKeys } from './use-resumes';

export const parsingKeys = {
  all:      ['parsing'] as const,
  byVersion: (resumeId: string, versionId: string) =>
    [...parsingKeys.all, 'version', resumeId, versionId] as const,
};

/**
 * Polls every 3s while ANY job is QUEUED or RUNNING, otherwise stays still.
 * Once everything is terminal the query stops refetching, eliminating idle
 * load on the API.
 */
export function useParsingJobs(resumeId: string, versionId: string | null | undefined) {
  return useQuery<ParsingJobView[]>({
    queryKey: parsingKeys.byVersion(resumeId, versionId ?? ''),
    queryFn:  () => listParsingJobs(resumeId, versionId!),
    enabled:  !!resumeId && !!versionId,
    refetchInterval: (q) => {
      const jobs = q.state.data;
      if (!jobs) return false;
      const live = jobs.some((j) => j.status === 'QUEUED' || j.status === 'RUNNING');
      return live ? 3000 : false;
    },
  });
}

export function useReparseResume(resumeId: string, versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider?: ResumeParserProvider) => reparse(resumeId, versionId, provider),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: parsingKeys.byVersion(resumeId, versionId) });
      qc.invalidateQueries({ queryKey: resumeKeys.detail(resumeId) });
    },
  });
}

export function useCancelParsingJob(resumeId: string, versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => cancelParsingJob(jobId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: parsingKeys.byVersion(resumeId, versionId) });
    },
  });
}
