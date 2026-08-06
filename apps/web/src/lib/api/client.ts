import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config';
import type { ApiError } from './types';

export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  // Required for httpOnly cookies to be sent cross-origin (localhost:3000 → :3001)
  withCredentials: true,
});

// ── Token refresh state ────────────────────────────────────────────────────
// Prevents multiple concurrent 401s from firing multiple refresh requests.
// All failed requests queue here while a refresh is in flight.
let isRefreshing = false;
let refreshSubscribers: Array<(retry: boolean) => void> = [];

function subscribeToRefresh(callback: (retry: boolean) => void): void {
  refreshSubscribers.push(callback);
}

function notifySubscribers(success: boolean): void {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

// ── Request interceptor ────────────────────────────────────────────────────
// Cookies are sent automatically by the browser (withCredentials: true).
// For cross-origin scenarios where cookies don't work, also send Authorization header.
apiClient.interceptors.request.use(
  (config) => {
    // Add Authorization header from localStorage if available (cross-origin fallback)
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ── Response interceptor — silent refresh on 401 ──────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const status = error.response?.status;

    // Only attempt refresh for 401s that aren't already a retry,
    // and not for auth endpoints themselves (avoid infinite loops).
    const isAuthEndpoint = originalRequest?.url?.includes('/api/v1/auth/');
    if (status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise((resolve, reject) => {
        subscribeToRefresh((success) => {
          if (success) {
            originalRequest._retry = true;
            resolve(apiClient(originalRequest));
          } else {
            reject(error);
          }
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Attempt silent refresh — server sets new access_token cookie
      await apiClient.post('/auth/refresh');
      isRefreshing = false;
      notifySubscribers(true);
      // Retry the original request with the new cookie
      return apiClient(originalRequest);
    } catch {
      isRefreshing = false;
      notifySubscribers(false);

      // Refresh failed — send user to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }
  },
);

/** Extract a human-readable message from an Axios error. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.error?.message ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

/** Return true when the Axios error has a specific HTTP status. */
export function isApiError(error: unknown, status: number): boolean {
  return axios.isAxiosError(error) && error.response?.status === status;
}
