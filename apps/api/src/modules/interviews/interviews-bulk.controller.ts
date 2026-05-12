import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../../common/helpers/response.helper';
import {
  BulkAddInterviewNoteDto,
  BulkChangeInterviewStatusDto,
} from './dto/bulk-interviews.dto';
import { InterviewsBulkService } from './interviews-bulk.service';

@Controller('interviews/bulk')
export class InterviewsBulkController {
  constructor(private readonly service: InterviewsBulkService) {}

  @Post('status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.INTERVIEWS_UPDATE)
  async changeStatus(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkChangeInterviewStatusDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.changeStatus(user, dto), req.requestId);
  }

  @Post('add-note')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.INTERVIEWS_UPDATE)
  async addNote(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkAddInterviewNoteDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.addNote(user, dto), req.requestId);
  }
}
