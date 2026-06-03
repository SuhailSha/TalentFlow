import type {
  DuplicateMatchDetail, DuplicateMatchListItem,
  DuplicateRunDetail, DuplicateRunSummary,
  ListDuplicateMatchesParams,
} from '@/types/duplicates';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

function buildParams(p: ListDuplicateMatchesParams): Record<string, unknown> {
  const out: Record<string, unknown> = { page: p.page ?? 1, limit: p.limit ?? 20 };
  if (p.status)            out.status            = p.status;
  if (p.tier)              out.tier              = p.tier;
  if (p.sourceCandidateId) out.sourceCandidateId = p.sourceCandidateId;
  return out;
}

export async function listDuplicateMatches(params: ListDuplicateMatchesParams = {}): Promise<PaginatedResponse<DuplicateMatchListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<DuplicateMatchListItem>>('/duplicate-matches', {
    params: buildParams(params),
  });
  return data;
}

export async function getDuplicateStats(): Promise<{ pending: number; exact: number }> {
  const { data } = await apiClient.get<ApiResponse<{ pending: number; exact: number }>>('/duplicate-matches/stats');
  return data.data;
}

export async function getDuplicateMatch(id: string): Promise<DuplicateMatchDetail> {
  const { data } = await apiClient.get<ApiResponse<DuplicateMatchDetail>>(`/duplicate-matches/${id}`);
  return data.data;
}

export async function markNotDuplicate(id: string, reason: string): Promise<DuplicateMatchDetail> {
  const { data } = await apiClient.post<ApiResponse<DuplicateMatchDetail>>(
    `/duplicate-matches/${id}/mark-not-duplicate`, { reason },
  );
  return data.data;
}

export async function deferDuplicateMatch(id: string, notes?: string): Promise<DuplicateMatchDetail> {
  const { data } = await apiClient.post<ApiResponse<DuplicateMatchDetail>>(
    `/duplicate-matches/${id}/defer`, { notes },
  );
  return data.data;
}

export async function getDuplicateRun(id: string): Promise<DuplicateRunDetail> {
  const { data } = await apiClient.get<ApiResponse<DuplicateRunDetail>>(`/duplicate-runs/${id}`);
  return data.data;
}

export async function manualDuplicateScan(candidateId: string): Promise<DuplicateRunSummary> {
  const { data } = await apiClient.post<ApiResponse<DuplicateRunSummary>>(
    `/candidates/${candidateId}/duplicate-scan`,
  );
  return data.data;
}
