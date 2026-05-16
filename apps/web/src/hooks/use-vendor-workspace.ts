'use client';

import { useQuery } from '@tanstack/react-query';

import { getVendorWorkspace } from '@/lib/api/vendor-workspace';

export const vendorWorkspaceKeys = {
  all:    ['vendor-workspace'] as const,
  detail: (id: string) => [...vendorWorkspaceKeys.all, id] as const,
};

export function useVendorWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: vendorWorkspaceKeys.detail(id ?? ''),
    queryFn:  () => getVendorWorkspace(id!),
    enabled:  !!id,
    staleTime: 30_000,
  });
}
