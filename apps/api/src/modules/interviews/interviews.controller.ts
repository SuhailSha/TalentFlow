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
import { InterviewsService } from './interviews.service';
import { ChangeInterviewStatusDto } from './dto/change-status.dto';
import { CreateInterviewDto, CreateInterviewNoteDto } from './dto/create-interview.dto';
import { ListInterviewsDto } from './dto/list-interviews.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { CreateFeedbackDto, UpdateFeedbackDto } from './dto/create-feedback.dto';

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly service: InterviewsService) {}

  // ── GET /interviews ────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.INTERVIEWS_READ)
  async list(
    @Query() dto: ListInterviewsDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const result = await this.service.list(user, dto);
    return paginated(result.data, result.meta, req.requestId);
  }

  // ── GET /interviews/stats ──────────────────────────────────────────────────

  @Get('stats')
  @RequirePermissions(Permission.INTERVIEWS_READ)
  async stats(@CurrentUser() user: RequestUser, @Req() req: Request) {
    const result = await this.service.stats(user);
    return ok(result, req.requestId);
  }

  // ── POST /interviews ───────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.INTERVIEWS_CREATE)
  async schedule(
    @Body() dto: CreateInterviewDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const interview = await this.service.schedule(user, dto);
    return ok(interview, req.requestId);
  }

  // ── GET /interviews/:id ────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions(Permission.INTERVIEWS_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const interview = await this.service.findOne(user, id);
    return ok(interview, req.requestId);
  }

  // ── PATCH /interviews/:id ──────────────────────────────────────────────────

  @Patch(':id')
  @RequirePermissions(Permission.INTERVIEWS_UPDATE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterviewDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const interview = await this.service.update(user, id, dto);
    return ok(interview, req.requestId);
  }

  // ── PUT /interviews/:id/status ─────────────────────────────────────────────

  @Put(':id/status')
  @RequirePermissions(Permission.INTERVIEWS_UPDATE)
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeInterviewStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const interview = await this.service.changeStatus(user, id, dto);
    return ok(interview, req.requestId);
  }

  // ── POST /interviews/:id/notes ─────────────────────────────────────────────

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.INTERVIEWS_UPDATE)
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInterviewNoteDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const note = await this.service.addNote(user, id, dto);
    return ok(note, req.requestId);
  }

  // ── POST /interviews/:id/feedback ──────────────────────────────────────────

  @Post(':id/feedback')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.INTERVIEWS_UPDATE)
  async addFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const feedback = await this.service.addFeedback(user, id, dto);
    return ok(feedback, req.requestId);
  }

  // ── PATCH /interviews/:id/feedback/:feedbackId ─────────────────────────────

  @Patch(':id/feedback/:feedbackId')
  @RequirePermissions(Permission.INTERVIEWS_UPDATE)
  async updateFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('feedbackId', ParseUUIDPipe) feedbackId: string,
    @Body() dto: UpdateFeedbackDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const feedback = await this.service.updateFeedback(user, id, feedbackId, dto);
    return ok(feedback, req.requestId);
  }

  // ── POST /interviews/:id/feedback/:feedbackId/submit ───────────────────────

  @Post(':id/feedback/:feedbackId/submit')
  @RequirePermissions(Permission.INTERVIEWS_UPDATE)
  async submitFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('feedbackId', ParseUUIDPipe) feedbackId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const feedback = await this.service.submitFeedback(user, id, feedbackId);
    return ok(feedback, req.requestId);
  }

  // ── POST /interviews/:id/participants ──────────────────────────────────────

  @Post(':id/participants')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.INTERVIEWS_UPDATE)
  async addParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddParticipantDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const participant = await this.service.addParticipant(user, id, dto);
    return ok(participant, req.requestId);
  }

  // ── DELETE /interviews/:id/participants/:participantId ─────────────────────

  @Delete(':id/participants/:participantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.INTERVIEWS_UPDATE)
  async removeParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.service.removeParticipant(user, id, participantId);
  }

  // ── DELETE /interviews/:id ─────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.INTERVIEWS_DELETE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.service.remove(user, id);
  }
}
