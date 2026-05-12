import type {
  CommunicationsStats,
  EmailDelivery,
  ListDeliveriesParams,
} from '@/types/communications';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

export async function listDeliveries(
  params: ListDeliveriesParams = {},
): Promise<PaginatedResponse<EmailDelivery>> {
  const { data } = await apiClient.get<PaginatedResponse<EmailDelivery>>(
    '/communications/deliveries',
    { params },
  );
  return data;
}

export async function getCommunicationsStats(): Promise<CommunicationsStats> {
  const { data } = await apiClient.get<ApiResponse<CommunicationsStats>>(
    '/communications/stats',
  );
  return data.data;
}
