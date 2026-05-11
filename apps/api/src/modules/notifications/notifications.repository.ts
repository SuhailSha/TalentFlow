import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly db: PrismaService) {}

  async findForRecipient(
    organizationId: string,
    recipientId: string,
    page: number,
    limit: number,
    unreadOnly = false,
  ) {
    const where: Prisma.NotificationWhereInput = {
      organizationId,
      recipientId,
      ...(unreadOnly && { isRead: false }),
    };
    const skip = (page - 1) * limit;

    const [data, total] = await this.db.$transaction([
      this.db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          reminder: { select: { id: true, type: true, priority: true, status: true } },
        },
      }),
      this.db.notification.count({ where }),
    ]);

    return { data, total };
  }

  async unreadCount(organizationId: string, recipientId: string) {
    return this.db.notification.count({
      where: { organizationId, recipientId, isRead: false },
    });
  }

  async markRead(id: string, recipientId: string) {
    return this.db.notification.updateMany({
      where: { id, recipientId },
      data:  { isRead: true, readAt: new Date(), status: 'READ' },
    });
  }

  async markAllRead(organizationId: string, recipientId: string) {
    return this.db.notification.updateMany({
      where: { organizationId, recipientId, isRead: false },
      data:  { isRead: true, readAt: new Date(), status: 'READ' },
    });
  }

  async create(data: Prisma.NotificationUncheckedCreateInput) {
    return this.db.notification.create({ data });
  }

  async createForReminder(params: {
    organizationId: string;
    recipientId:    string;
    reminderId:     string;
    title:          string;
    body?:          string;
    actionUrl?:     string;
  }) {
    return this.create({
      organizationId: params.organizationId,
      recipientId:    params.recipientId,
      reminderId:     params.reminderId,
      title:          params.title,
      ...(params.body      && { body: params.body }),
      ...(params.actionUrl && { actionUrl: params.actionUrl }),
      channel:        'IN_APP',
      status:         'DELIVERED',
      deliveredAt:    new Date(),
    });
  }
}
