import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

import type { ApiError } from '@/lib/api/types';

/**
 * Factory so each server render gets a fresh client (avoids cross-request
 * state sharing). The browser reuses a single instance via useRef in
 * QueryProvider.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 5 minutes before triggering a background refetch
        staleTime: 5 * 60 * 1_000,
        // Show cached data for up to 10 minutes after it goes stale
        gcTime: 10 * 60 * 1_000,
        // Don't retry client errors (4xx) — only transient server/network errors
        retry: (failureCount, error) => {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status && status >= 400 && status < 500) return false;
          }
          return failureCount < 2;
        },
        // Prevent surprise refetches when a tab regains focus
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
        onError: (error) => {
          if (axios.isAxiosError(error)) {
            const data = error.response?.data as ApiError | undefined;
            console.error('[mutation error]', data?.error?.message ?? error.message);
          }
        },
      },
    },
  });
}
