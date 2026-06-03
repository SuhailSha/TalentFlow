import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok, paginated } from '../../common/helpers/response.helper';
import { EmailService } from '../../email/email.service';
import { CommunicationsService } from './communications.service';
import { ListDeliveriesDto } from './dto/list-deliveries.dto';

@Controller('communications')
export class CommunicationsController {
  constructor(
    private readonly service: CommunicationsService,
    private readonly email:   EmailService,
  ) {}

  @Get('deliveries')
  @RequirePermissions(Permission.SETTINGS_READ)
  async listDeliveries(
    @CurrentUser() user: RequestUser,
    @Query() dto: ListDeliveriesDto,
    @Req() req: Request,
  ) {
    const { data, total } = await this.service.listDeliveries(user, {
      page:           dto.page,
      limit:          dto.limit,
      status:         dto.status,
      template:       dto.template,
      recipientEmail: dto.recipientEmail,
      resourceType:   dto.resourceType,
    });
    return paginated(data, { total, page: dto.page, limit: dto.limit }, req.requestId);
  }

  @Get('stats')
  @RequirePermissions(Permission.SETTINGS_READ)
  async stats(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.stats(user), req.requestId);
  }

  /**
   * Manually re-attempt delivery for a single EmailDelivery row.
   * Useful when the row is stuck in PENDING (Redis was down at send-time)
   * or FAILED (transient SMTP issue, recipient now valid, etc).
   */
  @Post('deliveries/:id/retry')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async retryDelivery(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const result = await this.email.requeueDelivery(id, user.organizationId);
    return ok(result, req.requestId);
  }
}
