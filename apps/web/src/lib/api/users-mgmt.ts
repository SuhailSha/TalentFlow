import type {
  AssignRolesDto,
  InviteUserDto,
  ListUsersParams,
  UserDetail,
  UserInvitation,
  UserListItem,
} from '@/types/settings';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

export async function listUsers(params: ListUsersParams = {}): Promise<PaginatedResponse<UserListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<UserListItem>>('/users', { params });
  return data;
}

export async function getUser(id: string): Promise<UserDetail> {
  const { data } = await apiClient.get<ApiResponse<UserDetail>>(`/users/${id}`);
  return data.data;
}

export async function inviteUser(dto: InviteUserDto): Promise<UserInvitation> {
  const { data } = await apiClient.post<ApiResponse<UserInvitation>>('/users/invite', dto);
  return data.data;
}

export async function listInvitations(): Promise<UserInvitation[]> {
  const { data } = await apiClient.get<ApiResponse<UserInvitation[]>>('/users/invitations');
  return data.data;
}

export async function revokeInvitation(id: string): Promise<void> {
  await apiClient.post(`/users/invitations/${id}/revoke`);
}

export async function resendInvitation(id: string): Promise<UserInvitation> {
  const { data } = await apiClient.post<ApiResponse<UserInvitation>>(`/users/invitations/${id}/resend`);
  return data.data;
}

export async function activateUser(id: string): Promise<UserListItem> {
  const { data } = await apiClient.post<ApiResponse<UserListItem>>(`/users/${id}/activate`);
  return data.data;
}

export async function deactivateUser(id: string): Promise<UserListItem> {
  const { data } = await apiClient.post<ApiResponse<UserListItem>>(`/users/${id}/deactivate`);
  return data.data;
}

export async function assignUserRoles(id: string, dto: AssignRolesDto): Promise<void> {
  await apiClient.put(`/users/${id}/roles`, dto);
}
