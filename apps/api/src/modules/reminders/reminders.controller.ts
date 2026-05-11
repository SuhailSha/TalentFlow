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
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok, paginated } from '../../common/helpers/response.helper';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { ListRemindersDto } from './dto/list-reminders.dto';
import { SnoozeReminderDto } from './dto/snooze-reminder.dto';
import { CompleteReminderDto, DismissReminderDto } from './dto/complete-reminder.dto';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly service: RemindersService) {}

  // ── Action Center ─────────────────────────────────────────────────────────

  @Get('action-center')
  @RequirePermissions(Permission.REMINDERS_READ)
  async actionCenter(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.actionCenter(user), req.requestId);
  }

  @Get('stats')
  @RequirePermissions(Permission.REMINDERS_READ)
  async stats(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.stats(user), req.requestId);
  }

  // ── List ──────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.REMINDERS_READ)
  async list(
    @CurrentUser() user: RequestUser,
    @Query() dto: ListRemindersDto,
    @Req() req: Request,
  ) {
    const { data, total } = await this.service.list(user, dto);
    return paginated(data, { total, page: dto.page ?? 1, limit: dto.limit ?? 20 }, req.requestId);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.REMINDERS_CREATE)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateReminderDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.create(user, dto), req.requestId);
  }

  // ── Get by id ─────────────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions(Permission.REMINDERS_READ)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return ok(await this.service.findById(user, id), req.requestId);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  @Patch(':id')
  @RequirePermissions(Permission.REMINDERS_UPDATE)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReminderDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.update(user, id, dto), req.requestId);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.REMINDERS_DELETE)
  delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.delete(user, id);
  }

  // ── State transitions ─────────────────────────────────────────────────────

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REMINDERS_UPDATE)
  async acknowledge(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return ok(await this.service.acknowledge(user, id), req.requestId);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REMINDERS_UPDATE)
  async complete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteReminderDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.complete(user, id, dto), req.requestId);
  }

  @Post(':id/snooze')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REMINDERS_UPDATE)
  async snooze(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SnoozeReminderDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.snooze(user, id, dto), req.requestId);
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REMINDERS_UPDATE)
  async dismiss(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DismissReminderDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.dismiss(user, id, dto), req.requestId);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REMINDERS_UPDATE)
  async reopen(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return ok(await this.service.reopen(user, id), req.requestId);
  }
}
