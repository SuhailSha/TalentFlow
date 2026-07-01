import { apiClient } from '@/lib/api/client';
import type { ApiResponse } from '@/lib/api/types';
import { FLAG_DEFAULTS, type FlagKey } from './flag-catalog';

/**
 * Fetch the current user's flag map from the server. Called once on app
 * mount by FeatureFlagsProvider; result is hydrated into a context.
 *
 * On any failure (network, server down) we return the defaults so the
 * UI degrades to its conservative state rather than blocking.
 */
export async function fetchFlags(): Promise<Record<FlagKey, boolean>> {
  try {
    const { data } = await apiClient.get<ApiResponse<Record<FlagKey, boolean>>>('/flags');
    return data.data;
  } catch {
    return { ...FLAG_DEFAULTS };
  }
}
