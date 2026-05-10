'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useRef } from 'react';

import { makeQueryClient } from '@/lib/query';
import type { QueryClient } from '@tanstack/react-query';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Creates a QueryClient on first render and reuses it for the lifetime of the
 * browser session. useRef avoids re-creating the client on every render while
 * keeping it out of module scope (important for SSR correctness — module-scope
 * singletons are shared across all server requests).
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = makeQueryClient();
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      {children}
      {process.env['NODE_ENV'] === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
