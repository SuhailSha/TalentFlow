import type {
  AssignSkillDto,
  CandidateDetail,
  CandidateListItem,
  CandidateNoteView,
  CandidateSkillView,
  CreateCandidateDto,
  CreateNoteDto,
  ListCandidatesParams,
  PotentialDuplicate,
  Skill,
  UpdateCandidateDto,
} from '@/types/candidates';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

function buildListParams(params: ListCandidatesParams): Record<string, unknown> {
  const p: Record<string, unknown> = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  };
  if (params.search) p.search = params.search;
  if (params.status?.length) p.status = params.status.join(',');
  if (params.availabilityStatus?.length) p.availabilityStatus = params.availabilityStatus.join(',');
  if (params.skillIds?.length) p.skillIds = params.skillIds.join(',');
  if (params.experienceMin !== undefined) p.experienceMin = params.experienceMin;
  if (params.experienceMax !== undefined) p.experienceMax = params.experienceMax;
  if (params.country) p.country = params.country;
  if (params.isRemote !== undefined) p.isRemote = params.isRemote;
  if (params.sortBy) p.sortBy = params.sortBy;
  if (params.sortOrder) p.sortOrder = params.sortOrder;
  return p;
}

export async function listCandidates(
  params: ListCandidatesParams = {},
): Promise<PaginatedResponse<CandidateListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<CandidateListItem>>('/candidates', {
    params: buildListParams(params),
  });
  return data;
}

export async function getCandidate(id: string): Promise<CandidateDetail> {
  const { data } = await apiClient.get<ApiResponse<CandidateDetail>>(`/candidates/${id}`);
  return data.data;
}

export async function createCandidate(
  dto: CreateCandidateDto,
): Promise<{ candidate: CandidateDetail; potentialDuplicates: PotentialDuplicate[] }> {
  const { data } = await apiClient.post<
    ApiResponse<{ candidate: CandidateDetail; potentialDuplicates: PotentialDuplicate[] }>
  >('/candidates', dto);
  return data.data;
}

export async function updateCandidate(
  id: string,
  dto: UpdateCandidateDto,
): Promise<CandidateDetail> {
  const { data } = await apiClient.patch<ApiResponse<CandidateDetail>>(`/candidates/${id}`, dto);
  return data.data;
}

export async function deleteCandidate(id: string): Promise<void> {
  await apiClient.delete(`/candidates/${id}`);
}

export async function transitionCandidateStatus(
  id: string,
  status: CandidateDetail['status'],
): Promise<CandidateDetail> {
  const { data } = await apiClient.put<ApiResponse<CandidateDetail>>(
    `/candidates/${id}/status`,
    { status },
  );
  return data.data;
}

export async function assignSkill(
  candidateId: string,
  dto: AssignSkillDto,
): Promise<CandidateSkillView> {
  const { data } = await apiClient.post<ApiResponse<CandidateSkillView>>(
    `/candidates/${candidateId}/skills`,
    dto,
  );
  return data.data;
}

export async function removeSkill(candidateId: string, skillId: string): Promise<void> {
  await apiClient.delete(`/candidates/${candidateId}/skills/${skillId}`);
}

export async function addNote(
  candidateId: string,
  dto: CreateNoteDto,
): Promise<CandidateNoteView> {
  const { data } = await apiClient.post<ApiResponse<CandidateNoteView>>(
    `/candidates/${candidateId}/notes`,
    dto,
  );
  return data.data;
}

export async function getNotes(candidateId: string): Promise<CandidateNoteView[]> {
  const { data } = await apiClient.get<ApiResponse<CandidateNoteView[]>>(
    `/candidates/${candidateId}/notes`,
  );
  return data.data;
}

export async function searchSkills(q: string): Promise<Skill[]> {
  const { data } = await apiClient.get<ApiResponse<Skill[]>>('/skills', { params: { q } });
  return data.data;
}

export async function getOrCreateSkill(name: string): Promise<Skill> {
  const { data } = await apiClient.post<ApiResponse<Skill>>('/skills', { name });
  return data.data;
}
