import { Injectable } from '@nestjs/common';
import { type Prisma, EmailDeliveryStatus } from '@repo/database';

import { PrismaService } from '../../database/prisma.service';
import type { RequestUser } from '../../auth/types/request-user.interface';

export interface ListDeliveriesParams {
  page?:           number;
  limit?:          number;
  status?:         EmailDeliveryStatus;
  template?:       string;
  recipientEmail?: string;
  resourceType?:   string;
}

@Injectable()
export class CommunicationsService {
  constructor(private readonly db: PrismaService) {}

  async listDeliveries(user: RequestUser, params: ListDeliveriesParams = {}) {
    const page  = params.page  ?? 1;
    const limit = Math.min(params.limit ?? 30, 100);

    const where: Prisma.EmailDeliveryWhereInput = {
      organizationId: user.organizationId,
      ...(params.status && { status: params.status }),
      ...(params.template && { template: params.template }),
      ...(params.resourceType && { resourceType: params.resourceType }),
      ...(params.recipientEmail && {
        recipientEmail: { contains: params.recipientEmail, mode: 'insensitive' },
      }),
    };

    const [data, total] = await this.db.$transaction([
      this.db.emailDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, template: true, provider: true, recipientEmail: true,
          recipientUserId: true, subject: true, status: true, attempts: true,
          lastAttemptAt: true, sentAt: true, failedAt: true, failureReason: true,
          providerMessageId: true, resourceType: true, resourceId: true,
          createdAt: true, updatedAt: true,
        },
      }),
      this.db.emailDelivery.count({ where }),
    ]);

    return { data, total };
  }

  async stats(user: RequestUser) {
    const orgId = user.organizationId;
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total24h, sent24h, failed24h, pending] = await Promise.all([
      this.db.emailDelivery.count({
        where: { organizationId: orgId, createdAt: { gte: since24h } },
      }),
      this.db.emailDelivery.count({
        where: { organizationId: orgId, status: 'SENT', createdAt: { gte: since24h } },
      }),
      this.db.emailDelivery.count({
        where: { organizationId: orgId, status: { in: ['FAILED', 'BOUNCED'] }, createdAt: { gte: since24h } },
      }),
      this.db.emailDelivery.count({
        where: { organizationId: orgId, status: { in: ['PENDING', 'QUEUED', 'RETRYING'] } },
      }),
    ]);

    return { total24h, sent24h, failed24h, pending };
  }
}
