import type { CandidateStatus, NoteType } from '@/types/candidates';
import type { ReminderPriority, ReminderType } from '@/types/reminders';
import type { BulkOperationResult } from '@/types/bulk';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export interface BulkChangeCandidateStatusBody {
  ids:     string[];
  status:  CandidateStatus;
  reason?: string;
}

export interface BulkAddCandidateNoteBody {
  ids:       string[];
  content:   string;
  noteType?: NoteType;
}

export interface BulkAddCandidateReminderBody {
  ids:          string[];
  type:         ReminderType;
  title:        string;
  description?: string;
  priority?:    ReminderPriority;
  dueAt?:       string;
}

export interface BulkDeleteCandidatesBody {
  ids: string[];
}

export async function bulkChangeCandidateStatus(
  body: BulkChangeCandidateStatusBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/candidates/bulk/status', body,
  );
  return data.data;
}

export async function bulkAddCandidateNote(
  body: BulkAddCandidateNoteBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/candidates/bulk/add-note', body,
  );
  return data.data;
}

export async function bulkAddCandidateReminder(
  body: BulkAddCandidateReminderBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/candidates/bulk/add-reminder', body,
  );
  return data.data;
}

export async function bulkDeleteCandidates(
  body: BulkDeleteCandidatesBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/candidates/bulk/delete', body,
  );
  return data.data;
}
