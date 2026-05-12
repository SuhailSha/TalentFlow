import { Controller, Get, Query, Req } from '@nestjs/common';
import { EmailDeliveryStatus } from '@repo/database';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok, paginated } from '../../common/helpers/response.helper';
import { CommunicationsService } from './communications.service';

@Controller('communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Get('deliveries')
  @RequirePermissions(Permission.SETTINGS_READ)
  async listDeliveries(
    @CurrentUser() user: RequestUser,
    @Query('page')           pageStr  = '1',
    @Query('limit')          limitStr = '30',
    @Query('status')         status?:  string,
    @Query('template')       template?: string,
    @Query('recipientEmail') recipientEmail?: string,
    @Query('resourceType')   resourceType?: string,
    @Req() req?: Request,
  ) {
    const page  = parseInt(pageStr,  10) || 1;
    const limit = parseInt(limitStr, 10) || 30;
    const { data, total } = await this.service.listDeliveries(user, {
      page, limit,
      status: status as EmailDeliveryStatus | undefined,
      template, recipientEmail, resourceType,
    });
    return paginated(data, { total, page, limit }, req?.requestId ?? '');
  }

  @Get('stats')
  @RequirePermissions(Permission.SETTINGS_READ)
  async stats(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.stats(user), req.requestId);
  }
}
