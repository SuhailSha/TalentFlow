import type { VendorWorkspace } from '@/types/vendor-workspace';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function getVendorWorkspace(id: string): Promise<VendorWorkspace> {
  const { data } = await apiClient.get<ApiResponse<VendorWorkspace>>(`/vendors/${id}/workspace`);
  return data.data;
}
