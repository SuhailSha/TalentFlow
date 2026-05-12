import type { InterviewStatus } from '@/types/interviews';
import type { NoteType } from '@/types/candidates';
import type { BulkOperationResult } from '@/types/bulk';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export interface BulkChangeInterviewStatusBody {
  ids:     string[];
  status:  InterviewStatus;
  reason?: string;
}

export interface BulkAddInterviewNoteBody {
  ids:       string[];
  content:   string;
  noteType?: NoteType;
}

export async function bulkChangeInterviewStatus(
  body: BulkChangeInterviewStatusBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/interviews/bulk/status', body,
  );
  return data.data;
}

export async function bulkAddInterviewNote(
  body: BulkAddInterviewNoteBody,
): Promise<BulkOperationResult> {
  const { data } = await apiClient.post<ApiResponse<BulkOperationResult>>(
    '/interviews/bulk/add-note', body,
  );
  return data.data;
}
