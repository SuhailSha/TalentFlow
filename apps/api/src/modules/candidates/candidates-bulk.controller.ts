import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../../common/helpers/response.helper';
import {
  BulkAddCandidateNoteDto,
  BulkAddCandidateReminderDto,
  BulkChangeCandidateStatusDto,
  BulkDeleteCandidatesDto,
} from './dto/bulk-candidates.dto';
import { CandidatesBulkService } from './candidates-bulk.service';

@Controller('candidates/bulk')
export class CandidatesBulkController {
  constructor(private readonly service: CandidatesBulkService) {}

  @Post('status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CANDIDATES_UPDATE)
  async changeStatus(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkChangeCandidateStatusDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.transitionStatus(user, dto), req.requestId);
  }

  @Post('add-note')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CANDIDATES_UPDATE)
  async addNote(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkAddCandidateNoteDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.addNote(user, dto), req.requestId);
  }

  @Post('add-reminder')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REMINDERS_CREATE)
  async addReminder(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkAddCandidateReminderDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.addReminder(user, dto), req.requestId);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CANDIDATES_DELETE)
  async softDelete(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkDeleteCandidatesDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.softDelete(user, dto), req.requestId);
  }
}
