import type {
  ActionCenter,
  CompleteReminderDto,
  CreateReminderDto,
  DismissReminderDto,
  ListRemindersParams,
  ReminderDetail,
  ReminderListItem,
  ReminderStats,
  SnoozeReminderDto,
  UpdateReminderDto,
} from '@/types/reminders';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

function buildListParams(p: ListRemindersParams): Record<string, unknown> {
  const out: Record<string, unknown> = {
    page:  p.page  ?? 1,
    limit: p.limit ?? 20,
  };
  if (p.status?.length)     out.status      = p.status.join(',');
  if (p.type?.length)       out.type        = p.type.join(',');
  if (p.priority?.length)   out.priority    = p.priority.join(',');
  if (p.assigneeId)         out.assigneeId  = p.assigneeId;
  if (p.submissionId)       out.submissionId = p.submissionId;
  if (p.interviewId)        out.interviewId = p.interviewId;
  if (p.candidateId)        out.candidateId = p.candidateId;
  if (p.sortBy)             out.sortBy      = p.sortBy;
  if (p.sortOrder)          out.sortOrder   = p.sortOrder;
  return out;
}

export async function listReminders(
  params: ListRemindersParams = {},
): Promise<PaginatedResponse<ReminderListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<ReminderListItem>>(
    '/reminders',
    { params: buildListParams(params) },
  );
  return data;
}

export async function getReminder(id: string): Promise<ReminderDetail> {
  const { data } = await apiClient.get<ApiResponse<ReminderDetail>>(`/reminders/${id}`);
  return data.data;
}

export async function getReminderStats(): Promise<ReminderStats> {
  const { data } = await apiClient.get<ApiResponse<ReminderStats>>('/reminders/stats');
  return data.data;
}

export async function getActionCenter(): Promise<ActionCenter> {
  const { data } = await apiClient.get<ApiResponse<ActionCenter>>('/reminders/action-center');
  return data.data;
}

export async function createReminder(dto: CreateReminderDto): Promise<ReminderListItem> {
  const { data } = await apiClient.post<ApiResponse<ReminderListItem>>('/reminders', dto);
  return data.data;
}

export async function updateReminder(id: string, dto: UpdateReminderDto): Promise<ReminderListItem> {
  const { data } = await apiClient.patch<ApiResponse<ReminderListItem>>(`/reminders/${id}`, dto);
  return data.data;
}

export async function deleteReminder(id: string): Promise<void> {
  await apiClient.delete(`/reminders/${id}`);
}

export async function acknowledgeReminder(id: string): Promise<ReminderListItem> {
  const { data } = await apiClient.post<ApiResponse<ReminderListItem>>(`/reminders/${id}/acknowledge`);
  return data.data;
}

export async function completeReminder(id: string, dto: CompleteReminderDto = {}): Promise<ReminderListItem> {
  const { data } = await apiClient.post<ApiResponse<ReminderListItem>>(`/reminders/${id}/complete`, dto);
  return data.data;
}

export async function snoozeReminder(id: string, dto: SnoozeReminderDto): Promise<ReminderListItem> {
  const { data } = await apiClient.post<ApiResponse<ReminderListItem>>(`/reminders/${id}/snooze`, dto);
  return data.data;
}

export async function dismissReminder(id: string, dto: DismissReminderDto = {}): Promise<ReminderListItem> {
  const { data } = await apiClient.post<ApiResponse<ReminderListItem>>(`/reminders/${id}/dismiss`, dto);
  return data.data;
}

export async function reopenReminder(id: string): Promise<ReminderListItem> {
  const { data } = await apiClient.post<ApiResponse<ReminderListItem>>(`/reminders/${id}/reopen`);
  return data.data;
}
