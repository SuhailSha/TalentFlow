export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS';
export type NotificationStatus = 'PENDING' | 'DELIVERED' | 'READ' | 'FAILED';

export interface NotificationView {
  id: string;
  organizationId: string;
  recipientId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  body: string | null;
  reminderId: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnreadCount {
  count: number;
}
