import type {
  ChangeStatusDto,
  CreateSubmissionDto,
  CreateSubmissionNoteDto,
  ListSubmissionsParams,
  SubmissionDetail,
  SubmissionListItem,
  SubmissionNoteView,
  SubmissionStats,
  UpdateSubmissionDto,
} from '@/types/submissions';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

function buildListParams(p: ListSubmissionsParams): Record<string, unknown> {
  const out: Record<string, unknown> = {
    page:  p.page  ?? 1,
    limit: p.limit ?? 20,
  };
  if (p.status?.length)    out.status    = p.status.join(',');
  if (p.candidateId)       out.candidateId = p.candidateId;
  if (p.jobId)             out.jobId     = p.jobId;
  if (p.vendorId)          out.vendorId  = p.vendorId;
  if (p.ownerId)           out.ownerId   = p.ownerId;
  if (p.sortBy)            out.sortBy    = p.sortBy;
  if (p.sortOrder)         out.sortOrder = p.sortOrder;
  return out;
}

export async function listSubmissions(
  params: ListSubmissionsParams = {},
): Promise<PaginatedResponse<SubmissionListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<SubmissionListItem>>(
    '/submissions',
    { params: buildListParams(params) },
  );
  return data;
}

export async function getSubmission(id: string): Promise<SubmissionDetail> {
  const { data } = await apiClient.get<ApiResponse<SubmissionDetail>>(
    `/submissions/${id}`,
  );
  return data.data;
}

export async function getSubmissionStats(): Promise<SubmissionStats> {
  const { data } = await apiClient.get<ApiResponse<SubmissionStats>>(
    '/submissions/stats',
  );
  return data.data;
}

export async function createSubmission(
  dto: CreateSubmissionDto,
): Promise<SubmissionDetail> {
  const { data } = await apiClient.post<ApiResponse<SubmissionDetail>>(
    '/submissions',
    dto,
  );
  return data.data;
}

export async function updateSubmission(
  id: string,
  dto: UpdateSubmissionDto,
): Promise<SubmissionDetail> {
  const { data } = await apiClient.patch<ApiResponse<SubmissionDetail>>(
    `/submissions/${id}`,
    dto,
  );
  return data.data;
}

export async function changeSubmissionStatus(
  id: string,
  dto: ChangeStatusDto,
): Promise<SubmissionDetail> {
  const { data } = await apiClient.put<ApiResponse<SubmissionDetail>>(
    `/submissions/${id}/status`,
    dto,
  );
  return data.data;
}

export async function addSubmissionNote(
  id: string,
  dto: CreateSubmissionNoteDto,
): Promise<SubmissionNoteView> {
  const { data } = await apiClient.post<ApiResponse<SubmissionNoteView>>(
    `/submissions/${id}/notes`,
    dto,
  );
  return data.data;
}

export async function deleteSubmission(id: string): Promise<void> {
  await apiClient.delete(`/submissions/${id}`);
}
