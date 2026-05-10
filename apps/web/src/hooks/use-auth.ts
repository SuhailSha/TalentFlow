'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { getMe, login, logout } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/client';
import type { LoginCredentials, UserProfile } from '@/types/auth';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

/**
 * Primary auth hook.
 *
 * Uses GET /auth/me as the source of truth for auth state.
 * - 200 → authenticated, `user` is populated
 * - 401 → unauthenticated, `user` is null (interceptor does NOT redirect here
 *          because /auth/me is the auth check itself)
 *
 * The query is refetched on window focus so sessions stay fresh
 * (overrides the global `refetchOnWindowFocus: false` default).
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<UserProfile | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getMe();
      } catch {
        // 401 = unauthenticated — not an error, just null user
        return null;
      }
    },
    staleTime: 5 * 60 * 1_000, // 5 min — aligned with access token TTL
    refetchOnWindowFocus: true,
    retry: false, // don't retry auth check failures
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: (profile) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, profile);
      router.push('/dashboard');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      router.push('/login');
    },
    onError: () => {
      // Force logout even if the server call fails
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      router.push('/login');
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isError,
    isAuthenticated: user !== null && user !== undefined,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    hasPermission: (permission: string) => user?.permissions.includes(permission) ?? false,
    hasRole: (role: string) => user?.roles.includes(role) ?? false,
    hasAnyRole: (roles: string[]) => roles.some((r) => user?.roles.includes(r)) ?? false,
  };
}
