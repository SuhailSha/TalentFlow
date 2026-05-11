'use client';

import { useQuery } from '@tanstack/react-query';

import { getEntityActivity } from '@/lib/api/activity';
import type { EntityType } from '@/types/activity';

export const activityKeys = {
  all:    ['activity'] as const,
  entity: (type: EntityType, id: string, limit: number) =>
    [...activityKeys.all, type, id, { limit }] as const,
};

export function useEntityActivity(
  entityType: EntityType,
  entityId: string | undefined,
  limit = 50,
) {
  return useQuery({
    queryKey: activityKeys.entity(entityType, entityId ?? '', limit),
    queryFn:  () => getEntityActivity(entityType, entityId!, limit),
    enabled:  !!entityId,
  });
}
