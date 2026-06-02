import type { ParsingJobView } from '@/types/parsing';
import type { ResumeParserProvider } from '@/types/extraction-config';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function listParsingJobs(resumeId: string, versionId: string): Promise<ParsingJobView[]> {
  const { data } = await apiClient.get<ApiResponse<ParsingJobView[]>>(
    `/resumes/${resumeId}/versions/${versionId}/parsing-jobs`,
  );
  return data.data;
}

export async function getParsingJob(jobId: string): Promise<ParsingJobView> {
  const { data } = await apiClient.get<ApiResponse<ParsingJobView>>(`/parsing-jobs/${jobId}`);
  return data.data;
}

export async function reparse(
  resumeId: string,
  versionId: string,
  provider?: ResumeParserProvider,
): Promise<{ parsingJobId: string; attempt: number; status: string; provider: ResumeParserProvider }> {
  const { data } = await apiClient.post<
    ApiResponse<{ parsingJobId: string; attempt: number; status: string; provider: ResumeParserProvider }>
  >(`/resumes/${resumeId}/versions/${versionId}/reparse`, provider ? { provider } : {});
  return data.data;
}

export async function cancelParsingJob(jobId: string): Promise<void> {
  await apiClient.post(`/parsing-jobs/${jobId}/cancel`);
}
