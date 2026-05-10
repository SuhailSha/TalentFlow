import type {
  AssignJobSkillDto,
  CreateJobDto,
  CreateJobNoteDto,
  JobDetail,
  JobListItem,
  JobNoteView,
  JobSkillView,
  JobStatus,
  ListJobsParams,
  UpdateJobDto,
} from '@/types/jobs';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

function buildListParams(params: ListJobsParams): Record<string, unknown> {
  const p: Record<string, unknown> = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  };
  if (params.search) p.search = params.search;
  if (params.status?.length) p.status = params.status.join(',');
  if (params.hiringPriority?.length) p.hiringPriority = params.hiringPriority.join(',');
  if (params.employmentType?.length) p.employmentType = params.employmentType.join(',');
  if (params.workMode?.length) p.workMode = params.workMode.join(',');
  if (params.department) p.department = params.department;
  if (params.country) p.country = params.country;
  if (params.hiringManagerId) p.hiringManagerId = params.hiringManagerId;
  if (params.experienceMin !== undefined) p.experienceMin = params.experienceMin;
  if (params.experienceMax !== undefined) p.experienceMax = params.experienceMax;
  if (params.sortBy) p.sortBy = params.sortBy;
  if (params.sortOrder) p.sortOrder = params.sortOrder;
  return p;
}

export async function listJobs(
  params: ListJobsParams = {},
): Promise<PaginatedResponse<JobListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<JobListItem>>('/jobs', {
    params: buildListParams(params),
  });
  return data;
}

export async function getJob(id: string): Promise<JobDetail> {
  const { data } = await apiClient.get<ApiResponse<JobDetail>>(`/jobs/${id}`);
  return data.data;
}

export async function createJob(dto: CreateJobDto): Promise<JobDetail> {
  const { data } = await apiClient.post<ApiResponse<JobDetail>>('/jobs', dto);
  return data.data;
}

export async function updateJob(id: string, dto: UpdateJobDto): Promise<JobDetail> {
  const { data } = await apiClient.patch<ApiResponse<JobDetail>>(`/jobs/${id}`, dto);
  return data.data;
}

export async function transitionJobStatus(
  id: string,
  status: JobStatus,
): Promise<JobDetail> {
  const { data } = await apiClient.put<ApiResponse<JobDetail>>(`/jobs/${id}/status`, { status });
  return data.data;
}

export async function assignJobSkill(
  jobId: string,
  dto: AssignJobSkillDto,
): Promise<JobSkillView> {
  const { data } = await apiClient.post<ApiResponse<JobSkillView>>(
    `/jobs/${jobId}/skills`,
    dto,
  );
  return data.data;
}

export async function removeJobSkill(jobId: string, skillId: string): Promise<void> {
  await apiClient.delete(`/jobs/${jobId}/skills/${skillId}`);
}

export async function addJobNote(
  jobId: string,
  dto: CreateJobNoteDto,
): Promise<JobNoteView> {
  const { data } = await apiClient.post<ApiResponse<JobNoteView>>(
    `/jobs/${jobId}/notes`,
    dto,
  );
  return data.data;
}

export async function getJobNotes(jobId: string): Promise<JobNoteView[]> {
  const { data } = await apiClient.get<ApiResponse<JobNoteView[]>>(`/jobs/${jobId}/notes`);
  return data.data;
}
