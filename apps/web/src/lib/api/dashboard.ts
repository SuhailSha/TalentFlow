import type { CommandCenter } from '@/types/dashboard';
import type { ApiResponse } from './types';
import { apiClient } from './client';

export async function getCommandCenter(): Promise<CommandCenter> {
  const { data } = await apiClient.get<ApiResponse<CommandCenter>>('/dashboard/command-center');
  return data.data;
}
