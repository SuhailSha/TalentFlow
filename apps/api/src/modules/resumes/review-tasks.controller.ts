import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query, Req,
} from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ResumeParserProvider } from '@repo/database';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok, paginated } from '../../common/helpers/response.helper';
import type { ApiResponse, PaginatedResponse } from '../../common/types';
import { ListReviewsDto } from './dto/list-reviews.dto';
import {
  ApproveReviewDto, RejectReviewDto, SaveDraftDto,
} from './dto/review-decision.dto';
import { ReviewTasksService } from './review-tasks.service';
import type { ReviewTaskDetail, ReviewTaskListItem } from './types/review.types';

class ReparseReviewDto {
  @IsOptional()
  @IsEnum(ResumeParserProvider)
  provider?: ResumeParserProvider;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

@Controller('resume-reviews')
export class ReviewTasksController {
  constructor(private readonly reviews: ReviewTasksService) {}

  // ── GET /resume-reviews ────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.RESUME_REVIEWS_READ)
  async list(
    @Query() dto: ListReviewsDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<PaginatedResponse<ReviewTaskListItem>> {
    const { tasks, total } = await this.reviews.findMany(user.organizationId, dto, user.userId);
    return paginated(tasks, { total, page: dto.page, limit: dto.limit }, req.requestId);
  }

  // ── GET /resume-reviews/stats — count for sidebar badge ────────────────────

  @Get('stats')
  @RequirePermissions(Permission.RESUME_REVIEWS_READ)
  async stats(@CurrentUser() user: RequestUser, @Req() req: Request) {
    const pending = await this.reviews.countPending(user.organizationId);
    return ok({ pending }, req.requestId);
  }

  // ── GET /resume-reviews/:id ────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions(Permission.RESUME_REVIEWS_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<ReviewTaskDetail>> {
    const task = await this.reviews.findById(id, user.organizationId);
    return ok(task, req.requestId);
  }

  // ── POST /resume-reviews/:id/claim ─────────────────────────────────────────

  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.RESUME_REVIEWS_CLAIM)
  async claim(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<ReviewTaskDetail>> {
    const task = await this.reviews.claim(id, user);
    return ok(task, req.requestId);
  }

  // ── POST /resume-reviews/:id/release ───────────────────────────────────────

  @Post(':id/release')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.RESUME_REVIEWS_CLAIM)
  async release(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.reviews.release(id, user);
  }

  // ── PATCH /resume-reviews/:id/draft  (autosave) ────────────────────────────

  @Patch(':id/draft')
  @RequirePermissions(Permission.RESUME_REVIEWS_CLAIM)
  async saveDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveDraftDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<{ draftVersion: number }>> {
    const result = await this.reviews.saveDraft(id, dto, user);
    return ok(result, req.requestId);
  }

  // ── POST /resume-reviews/:id/approve ───────────────────────────────────────

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.RESUME_REVIEWS_APPROVE)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveReviewDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<ReviewTaskDetail>> {
    const task = await this.reviews.approve(id, dto, user);
    return ok(task, req.requestId);
  }

  // ── POST /resume-reviews/:id/reject ────────────────────────────────────────

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.RESUME_REVIEWS_REJECT)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectReviewDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<ReviewTaskDetail>> {
    const task = await this.reviews.reject(id, dto, user);
    return ok(task, req.requestId);
  }

  // ── POST /resume-reviews/:id/reparse ───────────────────────────────────────

  @Post(':id/reparse')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(Permission.RESUMES_UPDATE)
  async reparse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReparseReviewDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<{ reviewTaskId: string; newParsingJobId: string }>> {
    const result = await this.reviews.requestReparse(id, user, dto.provider, dto.notes);
    return ok(result, req.requestId);
  }
}
