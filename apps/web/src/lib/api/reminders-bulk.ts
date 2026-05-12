import type { BulkOperationResult } from '@/types/bulk';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export interface BulkSnoozeRemindersBody {
  ids:      string[];
  minutes:  number;
  note?:    string;
}

export interface BulkCompleteRemindersBody {
  ids:   string[];
  note?: string;
}

export interface BulkDismissRemindersBody {
  ids:     string[];
  reason?: string;
}

export async function bulkSnoozeReminders(
  body: BulkSnoozeRemindersBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/reminders/bulk/snooze', body,
  );
  return data.data;
}

export async function bulkCompleteReminders(
  body: BulkCompleteRemindersBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/reminders/bulk/complete', body,
  );
  return data.data;
}

export async function bulkDismissReminders(
  body: BulkDismissRemindersBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/reminders/bulk/dismiss', body,
  );
  return data.data;
}
