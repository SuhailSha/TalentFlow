'use client';

import { Toaster } from 'sonner';

import { AuthProvider } from './auth-provider';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Root provider tree.
 *
 * Order (outside → inside):
 *   ThemeProvider  — dark/light class on <html> before paint
 *     QueryProvider — TanStack Query client + devtools
 *       AuthProvider — /auth/me session, RBAC helpers
 *         Toaster    — sonner toast portal (needs QueryClient for auth mutations)
 *         {children}
 *
 * AuthProvider wraps children so every page tree can access the current user
 * via useAuthContext() without prop-drilling.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <Toaster
            richColors
            position="top-right"
            closeButton
            toastOptions={{ duration: 4_000 }}
          />
          {children}
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
