'use client';

import { useQuery } from '@tanstack/react-query';

import { getCommandCenter } from '@/lib/api/dashboard';

export const dashboardKeys = {
  all:           ['dashboard']                        as const,
  commandCenter: () => [...dashboardKeys.all, 'command-center'] as const,
};

export function useCommandCenter() {
  return useQuery({
    queryKey: dashboardKeys.commandCenter(),
    queryFn:  getCommandCenter,
    refetchInterval: 60_000,
  });
}
