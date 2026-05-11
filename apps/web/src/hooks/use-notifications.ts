'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications';

// ── Query key factory ──────────────────────────────────────────────────────────

export const notificationKeys = {
  all:         ['notifications']                 as const,
  lists:       ()                               => [...notificationKeys.all, 'list']         as const,
  list:        (page: number, unreadOnly: boolean) => [...notificationKeys.lists(), { page, unreadOnly }] as const,
  unreadCount: ()                               => [...notificationKeys.all, 'unread-count'] as const,
};

// ── Query hooks ───────────────────────────────────────────────────────────────

export function useNotifications(page = 1, limit = 20, unreadOnly = false) {
  return useQuery({
    queryKey: notificationKeys.list(page, unreadOnly),
    queryFn:  () => listNotifications(page, limit, unreadOnly),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn:  () => getUnreadCount(),
    refetchInterval: 30_000,
  });
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}
