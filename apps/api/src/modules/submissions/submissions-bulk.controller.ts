import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../../common/helpers/response.helper';
import {
  BulkAddReminderDto,
  BulkArchiveDto,
  BulkAssignOwnerDto,
  BulkChangeStatusDto,
} from './dto/bulk-submissions.dto';
import { SubmissionsBulkService } from './submissions-bulk.service';

/**
 * Bulk operations live on a separate controller so the per-record
 * SubmissionsController stays focused. All endpoints share the same
 * response shape (BulkOperationResult) so the frontend can use one
 * generic toast renderer.
 */
@Controller('submissions/bulk')
export class SubmissionsBulkController {
  constructor(private readonly service: SubmissionsBulkService) {}

  @Post('status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.SUBMISSIONS_UPDATE)
  async changeStatus(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkChangeStatusDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.changeStatus(user, dto), req.requestId);
  }

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.SUBMISSIONS_UPDATE)
  async assignOwner(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkAssignOwnerDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.assignOwner(user, dto), req.requestId);
  }

  @Post('archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.SUBMISSIONS_UPDATE)
  async archive(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkArchiveDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.archive(user, dto), req.requestId);
  }

  @Post('add-reminder')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REMINDERS_CREATE)
  async addReminder(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkAddReminderDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.addReminder(user, dto), req.requestId);
  }
}
