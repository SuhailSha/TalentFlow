import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok, paginated } from '../../common/helpers/response.helper';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('unread-count')
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  async unreadCount(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.unreadCount(user), req.requestId);
  }

  @Get()
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  async list(
    @CurrentUser() user: RequestUser,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
    @Query('unreadOnly') unreadOnly = 'false',
    @Req() req: Request,
  ) {
    const pageNum  = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const { data, total } = await this.service.list(user, pageNum, limitNum, unreadOnly === 'true');
    return paginated(data, { total, page: pageNum, limit: limitNum }, req.requestId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  markRead(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markRead(user, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.service.markAllRead(user);
  }
}
