import type { SearchResult } from '@/types/search';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function search(q: string, limit = 5): Promise<SearchResult[]> {
  if (!q.trim()) return [];
  const { data } = await apiClient.get<ApiResponse<SearchResult[]>>('/search', {
    params: { q, limit },
  });
  return data.data;
}
