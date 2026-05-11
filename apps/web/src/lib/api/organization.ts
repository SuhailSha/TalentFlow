import type { Organization, OrganizationSettings, UpdateOrgProfileDto, UpdateOrgSettingsDto } from '@/types/settings';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function getOrganization(): Promise<Organization> {
  const { data } = await apiClient.get<ApiResponse<Organization>>('/organization');
  return data.data;
}

export async function updateOrganizationProfile(dto: UpdateOrgProfileDto): Promise<Organization> {
  const { data } = await apiClient.patch<ApiResponse<Organization>>('/organization', dto);
  return data.data;
}

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  const { data } = await apiClient.get<ApiResponse<OrganizationSettings>>('/organization/settings');
  return data.data;
}

export async function updateOrganizationSettings(dto: UpdateOrgSettingsDto): Promise<OrganizationSettings> {
  const { data } = await apiClient.patch<ApiResponse<OrganizationSettings>>('/organization/settings', dto);
  return data.data;
}
