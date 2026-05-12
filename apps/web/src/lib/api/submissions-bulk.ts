import type { ReminderPriority, ReminderType } from '@/types/reminders';
import type { SubmissionStatus } from '@/types/submissions';
import type { BulkOperationResult } from '@/types/bulk';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export interface BulkChangeStatusBody {
  ids:     string[];
  status:  SubmissionStatus;
  reason?: string;
}

export interface BulkAssignOwnerBody {
  ids:     string[];
  ownerId: string;
}

export interface BulkArchiveBody {
  ids: string[];
}

export interface BulkAddReminderBody {
  ids:          string[];
  type:         ReminderType;
  title:        string;
  description?: string;
  priority?:    ReminderPriority;
  /** ISO string */
  dueAt?:       string;
}

export async function bulkChangeSubmissionStatus(
  body: BulkChangeStatusBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/submissions/bulk/status', body,
  );
  return data.data;
}

export async function bulkAssignSubmissions(
  body: BulkAssignOwnerBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/submissions/bulk/assign', body,
  );
  return data.data;
}

export async function bulkArchiveSubmissions(
  body: BulkArchiveBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/submissions/bulk/archive', body,
  );
  return data.data;
}

export async function bulkAddReminderToSubmissions(
  body: BulkAddReminderBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/submissions/bulk/add-reminder', body,
  );
  return data.data;
}
