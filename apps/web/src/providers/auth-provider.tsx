'use client';

import { createContext, useContext, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import type { UserProfile } from '@/types/auth';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Wraps the app with auth state from useAuth().
 * Consuming components call useAuthContext() instead of useAuth() directly
 * to avoid extra /auth/me fetches — the query is deduped by TanStack Query,
 * but the hook call still goes through React reconciliation per usage.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, hasPermission, hasRole, hasAnyRole } = useAuth();

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated, hasPermission, hasRole, hasAnyRole }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isLoading, isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Use inside dashboard layouts and pages to access auth state. */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
