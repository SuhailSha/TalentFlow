import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../../common/helpers/response.helper';
import {
  BulkCompleteRemindersDto,
  BulkDismissRemindersDto,
  BulkSnoozeRemindersDto,
} from './dto/bulk-reminders.dto';
import { RemindersBulkService } from './reminders-bulk.service';

@Controller('reminders/bulk')
export class RemindersBulkController {
  constructor(private readonly service: RemindersBulkService) {}

  @Post('snooze')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REMINDERS_UPDATE)
  async snooze(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkSnoozeRemindersDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.snooze(user, dto), req.requestId);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REMINDERS_UPDATE)
  async complete(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkCompleteRemindersDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.complete(user, dto), req.requestId);
  }

  @Post('dismiss')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REMINDERS_UPDATE)
  async dismiss(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkDismissRemindersDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.dismiss(user, dto), req.requestId);
  }
}
