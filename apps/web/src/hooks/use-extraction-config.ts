'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getExtractionConfig, updateExtractionConfig } from '@/lib/api/extraction-config';
import type { UpdateExtractionConfigDto } from '@/types/extraction-config';

export const extractionConfigKeys = {
  all:    ['extraction-config'] as const,
  detail: () => [...extractionConfigKeys.all, 'detail'] as const,
};

export function useExtractionConfig() {
  return useQuery({
    queryKey: extractionConfigKeys.detail(),
    queryFn:  () => getExtractionConfig(),
    staleTime: 60_000,
  });
}

export function useUpdateExtractionConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateExtractionConfigDto) => updateExtractionConfig(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: extractionConfigKeys.detail() }),
  });
}
