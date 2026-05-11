'use client';

import { useQuery } from '@tanstack/react-query';

import { search } from '@/lib/api/search';

export const searchKeys = {
  all:   ['search']                            as const,
  query: (q: string) => [...searchKeys.all, q] as const,
};

export function useSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: searchKeys.query(q),
    queryFn:  () => search(q),
    enabled:  enabled && q.trim().length >= 2,
    staleTime: 10_000,
  });
}
