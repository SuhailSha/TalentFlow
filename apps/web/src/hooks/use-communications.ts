'use client';

import { useQuery } from '@tanstack/react-query';

import { getCommunicationsStats, listDeliveries } from '@/lib/api/communications';
import type { ListDeliveriesParams } from '@/types/communications';

export const communicationsKeys = {
  all:        ['communications']                                  as const,
  stats:      ()                              => [...communicationsKeys.all, 'stats']      as const,
  deliveries: ()                              => [...communicationsKeys.all, 'deliveries'] as const,
  list:       (p: ListDeliveriesParams)       => [...communicationsKeys.deliveries(), p]   as const,
};

export function useEmailDeliveries(params: ListDeliveriesParams = {}) {
  return useQuery({
    queryKey: communicationsKeys.list(params),
    queryFn:  () => listDeliveries(params),
    // 15s — fresh enough for operations dashboards; not so fresh that we
    // hammer the API while a user clicks through filters.
    staleTime: 15_000,
  });
}

export function useCommunicationsStats() {
  return useQuery({
    queryKey: communicationsKeys.stats(),
    queryFn:  getCommunicationsStats,
    staleTime: 60_000,
  });
}
