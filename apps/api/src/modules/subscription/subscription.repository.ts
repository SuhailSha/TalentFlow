import { Injectable } from '@nestjs/common';
import { OrgPlan } from '@repo/database';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly db: PrismaService) {}

  async findActive(orgId: string) {
    return this.db.subscription.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  async findPlan(code: OrgPlan) {
    return this.db.plan.findUnique({ where: { code } });
  }

  async findAllPlans() {
    return this.db.plan.findMany({ orderBy: { maxSeats: 'asc' } });
  }

  async findUsage(orgId: string) {
    return this.db.usageRecord.findMany({ where: { organizationId: orgId } });
  }

  async getSeatStats(orgId: string) {
    const subscription = await this.findActive(orgId);
    const total = subscription?.seatLimit ?? 0;
    const used = await this.db.user.count({
      where: { organizationId: orgId, status: 'ACTIVE', deletedAt: null },
    });
    return { total, used, available: total - used };
  }
}
