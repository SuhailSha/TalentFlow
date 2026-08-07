'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Root route — redirects based on authentication status.
 *
 * Authenticated users → /dashboard
 * Unauthenticated users → /login
 */
export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Debug logging
  useEffect(() => {
    console.log('Root page auth state:', { isAuthenticated, isLoading });
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      console.log('Auth resolved, redirecting...', isAuthenticated ? 'to dashboard' : 'to login');
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Fallback timeout - if auth check takes too long, redirect to login
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('Auth check timed out, redirecting to login');
        router.push('/login');
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading, router]);

  // Show loading while determining auth state
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
