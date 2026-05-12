import type { FailedJobView, QueueHealth, QueueName } from '@/types/queue';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function getQueueHealth(): Promise<QueueHealth> {
  const { data } = await apiClient.get<ApiResponse<QueueHealth>>('/queue/health');
  return data.data;
}

export async function getFailedJobs(queueName: QueueName, limit = 20): Promise<FailedJobView[]> {
  const { data } = await apiClient.get<ApiResponse<FailedJobView[]>>('/queue/failed-jobs', {
    params: { queueName, limit },
  });
  return data.data;
}

export async function retryFailedJob(queueName: QueueName, jobId: string): Promise<void> {
  await apiClient.post(`/queue/failed-jobs/${queueName}/${jobId}/retry`);
}

export async function removeFailedJob(queueName: QueueName, jobId: string): Promise<void> {
  await apiClient.delete(`/queue/failed-jobs/${queueName}/${jobId}`);
}
