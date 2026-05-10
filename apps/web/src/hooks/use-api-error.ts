'use client';

import { toast } from 'sonner';

import { getApiErrorMessage } from '@/lib/api';

/**
 * Returns a stable error handler that shows a toast and optionally calls
 * an onError callback. Pass it to TanStack Query mutation's onError option.
 */
export function useApiError(options?: { onError?: (message: string) => void }) {
  return (error: unknown) => {
    const message = getApiErrorMessage(error);
    toast.error(message);
    options?.onError?.(message);
  };
}
