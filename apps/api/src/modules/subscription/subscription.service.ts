import { Injectable } from '@nestjs/common';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { SubscriptionRepository } from './subscription.repository';

@Injectable()
export class SubscriptionService {
  constructor(private readonly repo: SubscriptionRepository) {}

  async getActiveSubscription(user: RequestUser) {
    return this.repo.findActive(user.organizationId);
  }

  async getAllPlans() {
    return this.repo.findAllPlans();
  }

  async getUsage(user: RequestUser) {
    return this.repo.findUsage(user.organizationId);
  }

  async getSeatStats(user: RequestUser) {
    return this.repo.getSeatStats(user.organizationId);
  }
}
