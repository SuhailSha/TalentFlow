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
import type { ApiResponse, PaginatedResponse } from '../../common/types';
import { JobsService } from './jobs.service';
import { AssignJobSkillDto } from './dto/assign-job-skill.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateJobNoteDto } from './dto/create-job-note.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import type { JobDetail, JobListItem } from './types/job.types';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ── GET /jobs ──────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.JOBS_READ)
  async list(
    @Query() dto: ListJobsDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<PaginatedResponse<JobListItem>> {
    const { jobs, total } = await this.jobsService.findMany(user.organizationId, dto);
    return paginated(jobs, { total, page: dto.page, limit: dto.limit }, req.requestId);
  }

  // ── POST /jobs ─────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.JOBS_CREATE)
  async create(
    @Body() dto: CreateJobDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<JobDetail>> {
    const job = await this.jobsService.create(dto, user);
    return ok(job, req.requestId);
  }

  // ── GET /jobs/:id ──────────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions(Permission.JOBS_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<JobDetail>> {
    const job = await this.jobsService.findById(id, user.organizationId);
    return ok(job, req.requestId);
  }

  // ── PATCH /jobs/:id ────────────────────────────────────────────────────────

  @Patch(':id')
  @RequirePermissions(Permission.JOBS_UPDATE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<JobDetail>> {
    const job = await this.jobsService.update(id, dto, user);
    return ok(job, req.requestId);
  }

  // ── PUT /jobs/:id/status ───────────────────────────────────────────────────

  @Put(':id/status')
  @RequirePermissions(Permission.JOBS_UPDATE)
  async transitionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<JobDetail>> {
    const job = await this.jobsService.transitionStatus(id, dto, user);
    return ok(job, req.requestId);
  }

  // ── POST /jobs/:id/skills ──────────────────────────────────────────────────

  @Post(':id/skills')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.JOBS_UPDATE)
  async assignSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignJobSkillDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const result = await this.jobsService.assignSkill(id, dto, user);
    return ok(result, req.requestId);
  }

  // ── DELETE /jobs/:id/skills/:skillId ───────────────────────────────────────

  @Delete(':id/skills/:skillId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.JOBS_UPDATE)
  async removeSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.jobsService.removeSkill(id, skillId, user);
  }

  // ── POST /jobs/:id/notes ───────────────────────────────────────────────────

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.JOBS_UPDATE)
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateJobNoteDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const note = await this.jobsService.addNote(id, dto, user);
    return ok(note, req.requestId);
  }

  // ── GET /jobs/:id/notes ────────────────────────────────────────────────────

  @Get(':id/notes')
  @RequirePermissions(Permission.JOBS_READ)
  async getNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const notes = await this.jobsService.getNotes(id, user);
    return ok(notes, req.requestId);
  }
}
