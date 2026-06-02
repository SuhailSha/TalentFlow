import type { ExtractionConfig, UpdateExtractionConfigDto } from '@/types/extraction-config';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function getExtractionConfig(): Promise<ExtractionConfig> {
  const { data } = await apiClient.get<ApiResponse<ExtractionConfig>>('/organization/extraction-config');
  return data.data;
}

export async function getExtractionDefaults(): Promise<Partial<ExtractionConfig>> {
  const { data } = await apiClient.get<ApiResponse<Partial<ExtractionConfig>>>(
    '/organization/extraction-config/defaults',
  );
  return data.data;
}

export async function updateExtractionConfig(
  dto: UpdateExtractionConfigDto,
): Promise<ExtractionConfig> {
  const { data } = await apiClient.put<ApiResponse<ExtractionConfig>>(
    '/organization/extraction-config',
    dto,
  );
  return data.data;
}
