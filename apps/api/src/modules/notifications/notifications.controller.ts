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
import { ListNotificationsDto } from './dto/list-notifications.dto';
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
    @Query() dto: ListNotificationsDto,
    @Req() req: Request,
  ) {
    const { data, total } = await this.service.list(
      user,
      dto.page,
      dto.limit,
      dto.unreadOnly ?? false,
    );
    return paginated(data, { total, page: dto.page, limit: dto.limit }, req.requestId);
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
