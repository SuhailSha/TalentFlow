'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getFailedJobs,
  getQueueHealth,
  removeFailedJob,
  retryFailedJob,
} from '@/lib/api/queue';
import type { QueueName } from '@/types/queue';

export const queueKeys = {
  all:    ['queue'] as const,
  health: () => [...queueKeys.all, 'health'] as const,
  failed: (q: QueueName, limit: number) =>
    [...queueKeys.all, 'failed', q, { limit }] as const,
};

/**
 * Live queue stats. Refetched every 10s when the page is in focus so an
 * operator can see backlog/in-flight changes without manual refresh.
 */
export function useQueueHealth() {
  return useQuery({
    queryKey: queueKeys.health(),
    queryFn:  getQueueHealth,
    refetchInterval: 10_000,
    staleTime:       5_000,
  });
}

export function useFailedJobs(queueName: QueueName, limit = 20, enabled = true) {
  return useQuery({
    queryKey: queueKeys.failed(queueName, limit),
    queryFn:  () => getFailedJobs(queueName, limit),
    enabled,
    refetchInterval: 15_000,
  });
}

export function useRetryFailedJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ queueName, jobId }: { queueName: QueueName; jobId: string }) =>
      retryFailedJob(queueName, jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

export function useRemoveFailedJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ queueName, jobId }: { queueName: QueueName; jobId: string }) =>
      removeFailedJob(queueName, jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}
