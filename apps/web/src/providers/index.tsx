'use client';

import { Toaster } from 'sonner';

import { AuthProvider } from './auth-provider';
import { FeatureFlagsProvider } from './feature-flags-provider';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { WorkspaceBrandingProvider } from './workspace-branding-provider';

interface ProvidersProps {
  children: React.ReactNode;
}

// Root provider tree.
//
// Order (outside → inside):
//   ThemeProvider              — dark/light class on <html> before paint
//     QueryProvider            — TanStack Query client + devtools
//       AuthProvider           — /auth/me session, RBAC helpers
//         WorkspaceBrandingProvider — tenant accent/logo/name; safe to read
//                                       even before auth resolves
//           Toaster
//           {children}
//
// WorkspaceBrandingProvider is given the default branding here. Tenant-specific
// overrides will flow in once Settings → Branding ships (Phase 4+). Today the
// provider establishes the contract and CSS-variable plumbing.
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <FeatureFlagsProvider>
            <WorkspaceBrandingProvider>
              <Toaster
                richColors
                position="top-right"
                closeButton
                toastOptions={{ duration: 4_000 }}
              />
              {children}
            </WorkspaceBrandingProvider>
          </FeatureFlagsProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
