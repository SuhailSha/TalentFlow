import type {
  ListResumesParams,
  ResumeAccessLogView,
  ResumeDetail,
  ResumeListItem,
  UpdateResumeDto,
  UploadResumeForm,
} from '@/types/resumes';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

function buildListParams(p: ListResumesParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // Resume API doesn't support pagination parameters
  if (p.candidateId) out.candidateId = p.candidateId;
  if (p.intakeBatchId) out.intakeBatchId = p.intakeBatchId;
  if (p.status) out.status = p.status;
  if (p.source) out.source = p.source;
  if (p.search) out.search = p.search;
  return out;
}

export async function listResumes(
  params: ListResumesParams = {},
): Promise<PaginatedResponse<ResumeListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<ResumeListItem>>('/resumes', {
    params: buildListParams(params),
  });
  return data;
}

export async function getResume(id: string): Promise<ResumeDetail> {
  const { data } = await apiClient.get<ApiResponse<ResumeDetail>>(`/resumes/${id}`);
  return data.data;
}

export async function uploadResume(
  form: UploadResumeForm,
): Promise<{ resume: ResumeDetail; draftCandidateCreated: boolean }> {
  const body = new FormData();
  body.append('file', form.file);
  if (form.candidateId) body.append('candidateId', form.candidateId);
  if (form.firstName) body.append('firstName', form.firstName);
  if (form.lastName) body.append('lastName', form.lastName);
  if (form.email) body.append('email', form.email);
  if (form.label) body.append('label', form.label);
  if (form.intakeBatchId) body.append('intakeBatchId', form.intakeBatchId);

  const { data } = await apiClient.post<
    ApiResponse<{ resume: ResumeDetail; draftCandidateCreated: boolean }>
  >('/resumes', body, {
    // Let the browser set the multipart boundary; axios default JSON header
    // must be cleared so it doesn't claim application/json on a FormData body.
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function uploadNewVersion(resumeId: string, file: File): Promise<ResumeDetail> {
  const body = new FormData();
  body.append('file', file);
  const { data } = await apiClient.post<ApiResponse<ResumeDetail>>(
    `/resumes/${resumeId}/versions`,
    body,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

export async function updateResume(id: string, dto: UpdateResumeDto): Promise<ResumeDetail> {
  const { data } = await apiClient.patch<ApiResponse<ResumeDetail>>(`/resumes/${id}`, dto);
  return data.data;
}

export async function deleteResume(id: string): Promise<void> {
  await apiClient.delete(`/resumes/${id}`);
}

/**
 * Build the download URL for a resume version. Browser navigates to this URL
 * which triggers attachment download via Content-Disposition.
 */
export function buildDownloadUrl(resumeId: string, versionId: string): string {
  // apiClient.baseURL already has /api/v1; append the path directly.
  const base = apiClient.defaults.baseURL?.replace(/\/$/, '') ?? '';
  return `${base}/resumes/${resumeId}/versions/${versionId}/download`;
}

export async function downloadResumeBlob(
  resumeId: string,
  versionId: string,
): Promise<{
  blob: Blob;
  fileName: string;
  contentType: string;
}> {
  const response = await apiClient.get(`/resumes/${resumeId}/versions/${versionId}/download`, {
    responseType: 'blob',
  });
  const cd = response.headers['content-disposition'] as string | undefined;
  // Best-effort filename parse: filename="x.pdf"
  const match = cd?.match(/filename="([^"]+)"/);
  return {
    blob: response.data as Blob,
    fileName: match?.[1] ?? `resume-${versionId}`,
    contentType:
      (response.headers['content-type'] as string | undefined) ?? 'application/octet-stream',
  };
}

export async function getAccessLog(
  resumeId: string,
  versionId: string,
): Promise<ResumeAccessLogView[]> {
  const { data } = await apiClient.get<ApiResponse<ResumeAccessLogView[]>>(
    `/resumes/${resumeId}/versions/${versionId}/access-log`,
  );
  return data.data;
}
