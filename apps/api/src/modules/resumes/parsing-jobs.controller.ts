import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { IsEnum, IsOptional } from 'class-validator';
import { ResumeParserProvider } from '@repo/database';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../../common/helpers/response.helper';
import { ParsingJobsService } from './parsing-jobs.service';

class ReparseDto {
  @IsOptional()
  @IsEnum(ResumeParserProvider)
  provider?: ResumeParserProvider;
}

/**
 * Parsing-related endpoints. No review actions in R2 — those land in R3.
 */
@Controller()
export class ParsingJobsController {
  constructor(private readonly parsing: ParsingJobsService) {}

  // ── GET /resumes/:id/versions/:vid/parsing-jobs ───────────────────────────

  @Get('resumes/:id/versions/:vid/parsing-jobs')
  @RequirePermissions(Permission.RESUMES_READ)
  async getHistory(
    @Param('id',  ParseUUIDPipe) _id:  string,
    @Param('vid', ParseUUIDPipe) vid:  string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const jobs = await this.parsing.getHistory(vid, user.organizationId);
    return ok(jobs, req.requestId);
  }

  // ── GET /parsing-jobs/:id ─────────────────────────────────────────────────

  @Get('parsing-jobs/:id')
  @RequirePermissions(Permission.RESUMES_READ)
  async getDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const job = await this.parsing.getDetail(id, user.organizationId);
    return ok(job, req.requestId);
  }

  // ── POST /resumes/:id/versions/:vid/reparse ───────────────────────────────

  @Post('resumes/:id/versions/:vid/reparse')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(Permission.RESUMES_UPDATE)
  async reparse(
    @Param('id',  ParseUUIDPipe) _id:  string,
    @Param('vid', ParseUUIDPipe) vid:  string,
    @Body() dto: ReparseDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const job = await this.parsing.reparse(vid, user, dto.provider);
    return ok({ parsingJobId: job.id, attempt: job.attempt, provider: job.provider, status: job.status }, req.requestId);
  }

  // ── POST /parsing-jobs/:id/cancel ─────────────────────────────────────────

  @Post('parsing-jobs/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.RESUMES_UPDATE)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.parsing.cancel(id, user.organizationId);
  }
}
