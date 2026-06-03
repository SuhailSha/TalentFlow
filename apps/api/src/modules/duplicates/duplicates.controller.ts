import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok, paginated } from '../../common/helpers/response.helper';
import type { ApiResponse, PaginatedResponse } from '../../common/types';
import {
  DeferMatchDto, ListMatchesDto, MarkNotDuplicateDto,
} from './dto/duplicate-decision.dto';
import { DuplicatesService } from './duplicates.service';
import type {
  DuplicateMatchDetail, DuplicateMatchListItem,
  DuplicateRunDetail, DuplicateRunSummary,
} from './types/match.types';

/**
 * Resource layout (R4):
 *   /candidates/:id/duplicate-scan       — kick a manual scan
 *   /candidates/:id/duplicate-runs       — runs against a candidate
 *   /duplicate-runs/:id                  — single run with matches
 *   /duplicate-matches                   — queue list with filters
 *   /duplicate-matches/stats             — pending count for sidebar badge
 *   /duplicate-matches/:id               — match detail (both candidates expanded)
 *   /duplicate-matches/:id/mark-not-duplicate
 *   /duplicate-matches/:id/defer
 *
 * No merge endpoints. No CONFIRMED_DUPLICATE transitions.
 */
@Controller()
export class DuplicatesController {
  constructor(private readonly duplicates: DuplicatesService) {}

  // ── Candidate-scoped ──────────────────────────────────────────────────────

  @Post('candidates/:id/duplicate-scan')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(Permission.DUPLICATES_SCAN)
  async manualScan(
    @Param('id', ParseUUIDPipe) candidateId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<DuplicateRunSummary>> {
    const run = await this.duplicates.manualScan(candidateId, user);
    return ok(run, req.requestId);
  }

  @Get('candidates/:id/duplicate-runs')
  @RequirePermissions(Permission.DUPLICATES_READ)
  async runHistory(
    @Param('id', ParseUUIDPipe) candidateId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<DuplicateRunSummary[]>> {
    const runs = await this.duplicates.runsForCandidate(candidateId, user.organizationId);
    return ok(runs, req.requestId);
  }

  // ── Runs ──────────────────────────────────────────────────────────────────

  @Get('duplicate-runs/:id')
  @RequirePermissions(Permission.DUPLICATES_READ)
  async getRun(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<DuplicateRunDetail>> {
    const run = await this.duplicates.getRun(id, user.organizationId);
    return ok(run, req.requestId);
  }

  // ── Matches (queue + decisions) ───────────────────────────────────────────

  @Get('duplicate-matches')
  @RequirePermissions(Permission.DUPLICATES_READ)
  async listMatches(
    @Query() dto: ListMatchesDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<PaginatedResponse<DuplicateMatchListItem>> {
    const { rows, total } = await this.duplicates.listMatches(user.organizationId, dto);
    return paginated(rows, { total, page: dto.page, limit: dto.limit }, req.requestId);
  }

  @Get('duplicate-matches/stats')
  @RequirePermissions(Permission.DUPLICATES_READ)
  async stats(@CurrentUser() user: RequestUser, @Req() req: Request) {
    const stats = await this.duplicates.stats(user.organizationId);
    return ok(stats, req.requestId);
  }

  @Get('duplicate-matches/:id')
  @RequirePermissions(Permission.DUPLICATES_READ)
  async getMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<DuplicateMatchDetail>> {
    const m = await this.duplicates.getMatchDetail(id, user.organizationId);
    return ok(m, req.requestId);
  }

  @Post('duplicate-matches/:id/mark-not-duplicate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DUPLICATES_RESOLVE)
  async markNotDuplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkNotDuplicateDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<DuplicateMatchDetail>> {
    const m = await this.duplicates.markNotDuplicate(id, dto.reason, user);
    return ok(m, req.requestId);
  }

  @Post('duplicate-matches/:id/defer')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DUPLICATES_RESOLVE)
  async defer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeferMatchDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<DuplicateMatchDetail>> {
    const m = await this.duplicates.defer(id, dto.notes, user);
    return ok(m, req.requestId);
  }
}
