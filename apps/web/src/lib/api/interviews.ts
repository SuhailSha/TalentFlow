import type {
  AddParticipantDto,
  ChangeInterviewStatusDto,
  CreateFeedbackDto,
  CreateInterviewNoteDto,
  InterviewDetail,
  InterviewFeedbackView,
  InterviewListItem,
  InterviewNoteView,
  InterviewParticipantView,
  InterviewStats,
  ListInterviewsParams,
  ScheduleInterviewDto,
  UpdateInterviewDto,
} from '@/types/interviews';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

function buildListParams(p: ListInterviewsParams): Record<string, unknown> {
  const out: Record<string, unknown> = {
    page:  p.page  ?? 1,
    limit: p.limit ?? 20,
  };
  if (p.status?.length)   out.status      = p.status.join(',');
  if (p.type?.length)     out.type        = p.type.join(',');
  if (p.submissionId)     out.submissionId = p.submissionId;
  if (p.candidateId)      out.candidateId = p.candidateId;
  if (p.jobId)            out.jobId       = p.jobId;
  if (p.ownerId)          out.ownerId     = p.ownerId;
  if (p.sortBy)           out.sortBy      = p.sortBy;
  if (p.sortOrder)        out.sortOrder   = p.sortOrder;
  return out;
}

export async function listInterviews(
  params: ListInterviewsParams = {},
): Promise<PaginatedResponse<InterviewListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<InterviewListItem>>(
    '/interviews',
    { params: buildListParams(params) },
  );
  return data;
}

export async function getInterview(id: string): Promise<InterviewDetail> {
  const { data } = await apiClient.get<ApiResponse<InterviewDetail>>(
    `/interviews/${id}`,
  );
  return data.data;
}

export async function getInterviewStats(): Promise<InterviewStats> {
  const { data } = await apiClient.get<ApiResponse<InterviewStats>>(
    '/interviews/stats',
  );
  return data.data;
}

export async function scheduleInterview(
  dto: ScheduleInterviewDto,
): Promise<InterviewDetail> {
  const { data } = await apiClient.post<ApiResponse<InterviewDetail>>(
    '/interviews',
    dto,
  );
  return data.data;
}

export async function updateInterview(
  id: string,
  dto: UpdateInterviewDto,
): Promise<InterviewDetail> {
  const { data } = await apiClient.patch<ApiResponse<InterviewDetail>>(
    `/interviews/${id}`,
    dto,
  );
  return data.data;
}

export async function changeInterviewStatus(
  id: string,
  dto: ChangeInterviewStatusDto,
): Promise<InterviewDetail> {
  const { data } = await apiClient.put<ApiResponse<InterviewDetail>>(
    `/interviews/${id}/status`,
    dto,
  );
  return data.data;
}

export async function addInterviewNote(
  id: string,
  dto: CreateInterviewNoteDto,
): Promise<InterviewNoteView> {
  const { data } = await apiClient.post<ApiResponse<InterviewNoteView>>(
    `/interviews/${id}/notes`,
    dto,
  );
  return data.data;
}

export async function addInterviewFeedback(
  id: string,
  dto: CreateFeedbackDto,
): Promise<InterviewFeedbackView> {
  const { data } = await apiClient.post<ApiResponse<InterviewFeedbackView>>(
    `/interviews/${id}/feedback`,
    dto,
  );
  return data.data;
}

export async function updateInterviewFeedback(
  id: string,
  feedbackId: string,
  dto: CreateFeedbackDto,
): Promise<InterviewFeedbackView> {
  const { data } = await apiClient.patch<ApiResponse<InterviewFeedbackView>>(
    `/interviews/${id}/feedback/${feedbackId}`,
    dto,
  );
  return data.data;
}

export async function submitInterviewFeedback(
  id: string,
  feedbackId: string,
): Promise<InterviewFeedbackView> {
  const { data } = await apiClient.post<ApiResponse<InterviewFeedbackView>>(
    `/interviews/${id}/feedback/${feedbackId}/submit`,
  );
  return data.data;
}

export async function addInterviewParticipant(
  id: string,
  dto: AddParticipantDto,
): Promise<InterviewParticipantView> {
  const { data } = await apiClient.post<ApiResponse<InterviewParticipantView>>(
    `/interviews/${id}/participants`,
    dto,
  );
  return data.data;
}

export async function removeInterviewParticipant(
  id: string,
  participantId: string,
): Promise<void> {
  await apiClient.delete(`/interviews/${id}/participants/${participantId}`);
}

export async function deleteInterview(id: string): Promise<void> {
  await apiClient.delete(`/interviews/${id}`);
}
