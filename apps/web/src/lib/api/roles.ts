import type { CreateRoleDto, RoleListItem, UpdateRoleDto } from '@/types/settings';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function listRoles(): Promise<RoleListItem[]> {
  const { data } = await apiClient.get<ApiResponse<RoleListItem[]>>('/roles');
  return data.data;
}

export async function getRole(id: string): Promise<RoleListItem> {
  const { data } = await apiClient.get<ApiResponse<RoleListItem>>(`/roles/${id}`);
  return data.data;
}

export async function createRole(dto: CreateRoleDto): Promise<RoleListItem> {
  const { data } = await apiClient.post<ApiResponse<RoleListItem>>('/roles', dto);
  return data.data;
}

export async function updateRole(id: string, dto: UpdateRoleDto): Promise<RoleListItem> {
  const { data } = await apiClient.patch<ApiResponse<RoleListItem>>(`/roles/${id}`, dto);
  return data.data;
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/roles/${id}`);
}
