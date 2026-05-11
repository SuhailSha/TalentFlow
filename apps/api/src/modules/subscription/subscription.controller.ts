import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../../common/helpers/response.helper';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly service: SubscriptionService) {}

  @Get()
  @RequirePermissions(Permission.SUBSCRIPTION_READ)
  async getActiveSubscription(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.getActiveSubscription(user), req.requestId);
  }

  @Get('plans')
  @RequirePermissions(Permission.SUBSCRIPTION_READ)
  async getAllPlans(@CurrentUser() _user: RequestUser, @Req() req: Request) {
    return ok(await this.service.getAllPlans(), req.requestId);
  }

  @Get('usage')
  @RequirePermissions(Permission.SUBSCRIPTION_READ)
  async getUsage(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.getUsage(user), req.requestId);
  }

  @Get('seats')
  @RequirePermissions(Permission.SUBSCRIPTION_READ)
  async getSeatStats(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.getSeatStats(user), req.requestId);
  }
}
