import type { NotificationView, UnreadCount } from '@/types/notifications';
import type { ApiResponse, PaginatedResponse } from './types';
import { apiClient } from './client';

export async function listNotifications(
  page = 1,
  limit = 20,
  unreadOnly = false,
): Promise<PaginatedResponse<NotificationView>> {
  const { data } = await apiClient.get<PaginatedResponse<NotificationView>>('/notifications', {
    params: { page, limit, unreadOnly },
  });
  return data;
}

export async function getUnreadCount(): Promise<UnreadCount> {
  const { data } = await apiClient.get<ApiResponse<UnreadCount>>('/notifications/unread-count');
  return data.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all');
}
