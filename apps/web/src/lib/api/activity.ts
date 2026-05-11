import type { ActivityEntry, EntityType } from '@/types/activity';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function getEntityActivity(
  entityType: EntityType,
  entityId: string,
  limit = 50,
): Promise<ActivityEntry[]> {
  const { data } = await apiClient.get<ApiResponse<ActivityEntry[]>>(
    `/activity/${entityType}/${entityId}`,
    { params: { limit } },
  );
  return data.data;
}
