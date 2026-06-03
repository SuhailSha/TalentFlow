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
import { CandidatesService } from './candidates.service';
import { CandidateWorkspaceService } from './candidate-workspace.service';
import { SkillsService } from './skills.service';
import type { CandidateWorkspace } from './types/workspace.types';
import { AssignSkillDto } from './dto/assign-skill.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { ListCandidatesDto } from './dto/list-candidates.dto';
import { TransitionCandidateStatusDto } from './dto/transition-status.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import type { CandidateDetail, CandidateListItem } from './types/candidate.types';

@Controller('candidates')
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly workspaceService: CandidateWorkspaceService,
  ) {}

  // ── GET /candidates ────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.CANDIDATES_READ)
  async list(
    @Query() dto: ListCandidatesDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<PaginatedResponse<CandidateListItem>> {
    const { candidates, total } = await this.candidatesService.findMany(
      user.organizationId,
      dto,
    );
    return paginated(candidates, { total, page: dto.page, limit: dto.limit }, req.requestId);
  }

  // ── POST /candidates ───────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.CANDIDATES_CREATE)
  async create(
    @Body() dto: CreateCandidateDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<{ candidate: CandidateDetail; potentialDuplicates: unknown[] }>> {
    const result = await this.candidatesService.create(dto, user);
    return ok(result, req.requestId);
  }

  // ── GET /candidates/:id ────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions(Permission.CANDIDATES_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<CandidateDetail>> {
    const candidate = await this.candidatesService.findById(id, user.organizationId);
    return ok(candidate, req.requestId);
  }

  // ── GET /candidates/:id/workspace ──────────────────────────────────────────
  // Single aggregation endpoint backing the operational candidate workspace.
  // See CandidateWorkspaceService for the response shape + health-signal logic.

  @Get(':id/workspace')
  @RequirePermissions(Permission.CANDIDATES_READ)
  async getWorkspace(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<CandidateWorkspace>> {
    const ws = await this.workspaceService.getWorkspace(id, user.organizationId);
    return ok(ws, req.requestId);
  }

  // ── PATCH /candidates/:id/owner ────────────────────────────────────────────
  // Reassign the relationship owner. Restricted to candidates:update.

  @Patch(':id/owner')
  @RequirePermissions(Permission.CANDIDATES_UPDATE)
  async assignOwner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { ownerId: string | null },
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<CandidateDetail>> {
    const candidate = await this.candidatesService.assignOwner(id, body.ownerId, user);
    return ok(candidate, req.requestId);
  }

  // ── PATCH /candidates/:id ──────────────────────────────────────────────────

  @Patch(':id')
  @RequirePermissions(Permission.CANDIDATES_UPDATE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<CandidateDetail>> {
    const candidate = await this.candidatesService.update(id, dto, user);
    return ok(candidate, req.requestId);
  }

  // ── DELETE /candidates/:id ─────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.CANDIDATES_DELETE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.candidatesService.softDelete(id, user);
  }

  // ── PUT /candidates/:id/status ────────────────────────────────────────────

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CANDIDATES_UPDATE)
  async transitionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionCandidateStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<CandidateDetail>> {
    const candidate = await this.candidatesService.transitionStatus(id, dto, user);
    return ok(candidate, req.requestId);
  }

  // ── POST /candidates/:id/skills ────────────────────────────────────────────

  @Post(':id/skills')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CANDIDATES_UPDATE)
  async assignSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSkillDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const result = await this.candidatesService.assignSkill(id, dto, user);
    return ok(result, req.requestId);
  }

  // ── DELETE /candidates/:id/skills/:skillId ─────────────────────────────────

  @Delete(':id/skills/:skillId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.CANDIDATES_UPDATE)
  async removeSkill(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.candidatesService.removeSkill(id, skillId, user);
  }

  // ── POST /candidates/:id/notes ─────────────────────────────────────────────

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.CANDIDATES_UPDATE)
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const note = await this.candidatesService.addNote(id, dto, user);
    return ok(note, req.requestId);
  }

  // ── GET /candidates/:id/notes ──────────────────────────────────────────────

  @Get(':id/notes')
  @RequirePermissions(Permission.CANDIDATES_READ)
  async getNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const notes = await this.candidatesService.getNotes(id, user);
    return ok(notes, req.requestId);
  }
}

// ── Skills catalogue endpoints ────────────────────────────────────────────────

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  /** Autocomplete — search skills by name prefix. Used by skill assignment UI. */
  @Get()
  @RequirePermissions(Permission.CANDIDATES_READ)
  async search(@Query('q') q: string, @Req() req: Request) {
    const skills = await this.skillsService.search(q ?? '', 30);
    return ok(skills, req.requestId);
  }

  /** Get-or-create a skill by display name. */
  @Post()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CANDIDATES_UPDATE)
  async getOrCreate(
    @Body('name') name: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const skill = await this.skillsService.getOrCreate(name, undefined, user.organizationId);
    return ok(skill, req.requestId);
  }
}
