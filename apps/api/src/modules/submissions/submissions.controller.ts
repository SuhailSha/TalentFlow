import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok, paginated } from '../../common/helpers/response.helper';
import { SubmissionsService } from './submissions.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateSubmissionDto, CreateSubmissionNoteDto } from './dto/create-submission.dto';
import { ListSubmissionsDto } from './dto/list-submissions.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  // ── GET /submissions ───────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.SUBMISSIONS_READ)
  async list(
    @Query() dto: ListSubmissionsDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const result = await this.service.list(user, dto);
    return paginated(result.data, result.meta, req.requestId);
  }

  // ── GET /submissions/stats ─────────────────────────────────────────────────

  @Get('stats')
  @RequirePermissions(Permission.SUBMISSIONS_READ)
  async stats(@CurrentUser() user: RequestUser, @Req() req: Request) {
    const result = await this.service.stats(user);
    return ok(result, req.requestId);
  }

  // ── POST /submissions ──────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.SUBMISSIONS_CREATE)
  async create(
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const submission = await this.service.create(user, dto);
    return ok(submission, req.requestId);
  }

  // ── GET /submissions/:id ───────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions(Permission.SUBMISSIONS_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const submission = await this.service.findOne(user, id);
    return ok(submission, req.requestId);
  }

  // ── PATCH /submissions/:id ─────────────────────────────────────────────────

  @Patch(':id')
  @RequirePermissions(Permission.SUBMISSIONS_UPDATE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubmissionDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const submission = await this.service.update(user, id, dto);
    return ok(submission, req.requestId);
  }

  // ── PUT /submissions/:id/status ────────────────────────────────────────────

  @Put(':id/status')
  @RequirePermissions(Permission.SUBMISSIONS_UPDATE)
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const submission = await this.service.changeStatus(user, id, dto);
    return ok(submission, req.requestId);
  }

  // ── POST /submissions/:id/notes ────────────────────────────────────────────

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.SUBMISSIONS_UPDATE)
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSubmissionNoteDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const note = await this.service.addNote(user, id, dto);
    return ok(note, req.requestId);
  }

  // ── DELETE /submissions/:id ────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.SUBMISSIONS_UPDATE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.service.remove(user, id);
  }
}
