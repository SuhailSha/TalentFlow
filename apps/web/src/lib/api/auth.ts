import type { AuthResponse, LoginCredentials, UserProfile } from '@/types/auth';
import type { AcceptInvitationDto, InvitationPreview } from '@/types/settings';
import { apiClient } from './client';

/**
 * Auth API — all calls use httpOnly cookies (set/cleared by the API server).
 * No tokens are handled client-side; the browser manages cookie transmission.
 */

export async function login(credentials: LoginCredentials): Promise<UserProfile> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);

  // Store tokens in localStorage for cross-origin scenarios where cookies don't work
  if (data.tokens) {
    localStorage.setItem('access_token', data.tokens.accessToken);
    localStorage.setItem('refresh_token', data.tokens.refreshToken);
  }

  return data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post<{ ok: true }>('/auth/logout');

  // Clear localStorage tokens for cross-origin scenarios
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

/** Silent token refresh — called by the interceptor on 401. */
export async function refreshTokens(): Promise<void> {
  await apiClient.post<{ ok: true }>('/auth/refresh');
}

/** Fetch the current user's profile. 401 if not authenticated. */
export async function getMe(): Promise<UserProfile> {
  const { data } = await apiClient.get<AuthResponse>('/auth/me');
  return data.user;
}

/**
 * Public endpoint: preview an invitation by raw token.
 * Throws if the token is invalid, revoked, accepted, or expired.
 */
export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const { data } = await apiClient.get<InvitationPreview>(
    `/auth/invitations/${encodeURIComponent(token)}/preview`,
  );
  return data;
}

/**
 * Public endpoint: accept an invitation and start a session.
 * Sets the auth cookies on success.
 */
export async function acceptInvitation(dto: AcceptInvitationDto): Promise<UserProfile> {
  const { data } = await apiClient.post<AuthResponse>('/auth/accept-invitation', dto);
  return data.user;
}
