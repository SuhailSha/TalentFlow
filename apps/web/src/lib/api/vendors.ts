import type {
  CreateVendorContactDto,
  CreateVendorDto,
  CreateVendorNoteDto,
  ListVendorsParams,
  PotentialDuplicateVendor,
  UpdateVendorContactDto,
  UpdateVendorDto,
  VendorContactView,
  VendorDetail,
  VendorListItem,
  VendorNoteView,
  VendorStatus,
} from '@/types/vendors';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

function buildListParams(params: ListVendorsParams): Record<string, unknown> {
  const p: Record<string, unknown> = {
    page:  params.page  ?? 1,
    limit: params.limit ?? 20,
  };
  if (params.search)                p.search               = params.search;
  if (params.status?.length)        p.status               = params.status.join(',');
  if (params.type?.length)          p.type                 = params.type.join(',');
  if (params.priority?.length)      p.priority             = params.priority.join(',');
  if (params.country)               p.country              = params.country;
  if (params.domain)                p.domain               = params.domain;
  if (params.relationshipOwnerId)   p.relationshipOwnerId  = params.relationshipOwnerId;
  if (params.sortBy)                p.sortBy               = params.sortBy;
  if (params.sortOrder)             p.sortOrder            = params.sortOrder;
  return p;
}

export async function listVendors(
  params: ListVendorsParams = {},
): Promise<PaginatedResponse<VendorListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<VendorListItem>>('/vendors', {
    params: buildListParams(params),
  });
  return data;
}

export async function getVendor(id: string): Promise<VendorDetail> {
  const { data } = await apiClient.get<ApiResponse<VendorDetail>>(`/vendors/${id}`);
  return data.data;
}

export async function createVendor(
  dto: CreateVendorDto,
): Promise<{ vendor: VendorDetail; potentialDuplicates: PotentialDuplicateVendor[] }> {
  const { data } = await apiClient.post<
    ApiResponse<{ vendor: VendorDetail; potentialDuplicates: PotentialDuplicateVendor[] }>
  >('/vendors', dto);
  return data.data;
}

export async function updateVendor(id: string, dto: UpdateVendorDto): Promise<VendorDetail> {
  const { data } = await apiClient.patch<ApiResponse<VendorDetail>>(`/vendors/${id}`, dto);
  return data.data;
}

export async function deleteVendor(id: string): Promise<void> {
  await apiClient.delete(`/vendors/${id}`);
}

export async function transitionVendorStatus(
  id: string,
  status: VendorStatus,
): Promise<VendorDetail> {
  const { data } = await apiClient.put<ApiResponse<VendorDetail>>(
    `/vendors/${id}/status`,
    { status },
  );
  return data.data;
}

export async function addVendorContact(
  vendorId: string,
  dto: CreateVendorContactDto,
): Promise<VendorContactView> {
  const { data } = await apiClient.post<ApiResponse<VendorContactView>>(
    `/vendors/${vendorId}/contacts`,
    dto,
  );
  return data.data;
}

export async function updateVendorContact(
  vendorId: string,
  contactId: string,
  dto: UpdateVendorContactDto,
): Promise<VendorContactView> {
  const { data } = await apiClient.patch<ApiResponse<VendorContactView>>(
    `/vendors/${vendorId}/contacts/${contactId}`,
    dto,
  );
  return data.data;
}

export async function removeVendorContact(
  vendorId: string,
  contactId: string,
): Promise<void> {
  await apiClient.delete(`/vendors/${vendorId}/contacts/${contactId}`);
}

export async function addVendorNote(
  vendorId: string,
  dto: CreateVendorNoteDto,
): Promise<VendorNoteView> {
  const { data } = await apiClient.post<ApiResponse<VendorNoteView>>(
    `/vendors/${vendorId}/notes`,
    dto,
  );
  return data.data;
}

export async function getVendorNotes(vendorId: string): Promise<VendorNoteView[]> {
  const { data } = await apiClient.get<ApiResponse<VendorNoteView[]>>(
    `/vendors/${vendorId}/notes`,
  );
  return data.data;
}
