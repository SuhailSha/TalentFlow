import type {
  ApproveBody,
  ListReviewsParams,
  RejectBody,
  ReparseBody,
  ReviewTaskDetail,
  ReviewTaskListItem,
  SaveDraftBody,
} from '@/types/reviews';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

function buildParams(p: ListReviewsParams): Record<string, unknown> {
  const out: Record<string, unknown> = { page: p.page ?? 1, limit: p.limit ?? 20 };
  if (p.status)     out.status     = p.status;
  if (p.priority)   out.priority   = p.priority;
  if (p.assigneeId) out.assigneeId = p.assigneeId;
  if (p.mineOnly)   out.mineOnly   = 'true';
  return out;
}

export async function listReviews(params: ListReviewsParams = {}): Promise<PaginatedResponse<ReviewTaskListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<ReviewTaskListItem>>('/resume-reviews', {
    params: buildParams(params),
  });
  return data;
}

export async function getReviewStats(): Promise<{ pending: number }> {
  const { data } = await apiClient.get<ApiResponse<{ pending: number }>>('/resume-reviews/stats');
  return data.data;
}

export async function getReview(id: string): Promise<ReviewTaskDetail> {
  const { data } = await apiClient.get<ApiResponse<ReviewTaskDetail>>(`/resume-reviews/${id}`);
  return data.data;
}

export async function claimReview(id: string): Promise<ReviewTaskDetail> {
  const { data } = await apiClient.post<ApiResponse<ReviewTaskDetail>>(`/resume-reviews/${id}/claim`);
  return data.data;
}

export async function releaseReview(id: string): Promise<void> {
  await apiClient.post(`/resume-reviews/${id}/release`);
}

export async function saveReviewDraft(id: string, body: SaveDraftBody): Promise<{ draftVersion: number }> {
  const { data } = await apiClient.patch<ApiResponse<{ draftVersion: number }>>(
    `/resume-reviews/${id}/draft`, body,
  );
  return data.data;
}

export async function approveReview(id: string, body: ApproveBody): Promise<ReviewTaskDetail> {
  const { data } = await apiClient.post<ApiResponse<ReviewTaskDetail>>(`/resume-reviews/${id}/approve`, body);
  return data.data;
}

export async function rejectReview(id: string, body: RejectBody): Promise<ReviewTaskDetail> {
  const { data } = await apiClient.post<ApiResponse<ReviewTaskDetail>>(`/resume-reviews/${id}/reject`, body);
  return data.data;
}

export async function reparseFromReview(id: string, body: ReparseBody): Promise<{ reviewTaskId: string; newParsingJobId: string }> {
  const { data } = await apiClient.post<ApiResponse<{ reviewTaskId: string; newParsingJobId: string }>>(
    `/resume-reviews/${id}/reparse`, body,
  );
  return data.data;
}
