import type { CandidateDetail } from '@/types/candidates';
import type { CandidateWorkspace } from '@/types/candidate-workspace';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function getCandidateWorkspace(id: string): Promise<CandidateWorkspace> {
  const { data } = await apiClient.get<ApiResponse<CandidateWorkspace>>(
    `/candidates/${id}/workspace`,
  );
  return data.data;
}

export async function assignCandidateOwner(
  id: string,
  ownerId: string | null,
): Promise<CandidateDetail> {
  const { data } = await apiClient.patch<ApiResponse<CandidateDetail>>(
    `/candidates/${id}/owner`,
    { ownerId },
  );
  return data.data;
}
