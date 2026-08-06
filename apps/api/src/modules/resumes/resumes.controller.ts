import {
  BadRequestException,
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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

// Type declaration for Multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok, paginated } from '../../common/helpers/response.helper';
import type { ApiResponse, PaginatedResponse } from '../../common/types';
import { type ResumesService } from './resumes.service';
import { type CreateIntakeBatchDto } from './dto/create-intake-batch.dto';
import { type ListResumesDto } from './dto/list-resumes.dto';
import { type UpdateResumeDto } from './dto/update-resume.dto';
import { type UploadResumeDto } from './dto/upload-resume.dto';
import type { ResumeDetail, ResumeListItem } from './types/resume.types';

// 50 MB Multer ceiling — actual per-org ceiling is enforced inside the
// StorageService (default 10 MB). Higher Multer limit prevents large files
// from being silently truncated by Express before our validator sees them.
const MULTER_MAX_BYTES = 50 * 1024 * 1024;

@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumes: ResumesService) {}

  // ── GET /resumes ──────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.RESUMES_READ)
  async list(
    @Query() dto: ListResumesDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<PaginatedResponse<ResumeListItem>> {
    const { resumes, total } = await this.resumes.findMany(user.organizationId, dto);
    return paginated(resumes, { total, page: dto.page, limit: dto.limit }, req.requestId);
  }

  // ── POST /resumes  (multipart) ────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.RESUMES_CREATE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MULTER_MAX_BYTES } }))
  async upload(
    @UploadedFile() file: MulterFile | undefined,
    @Body() dto: UploadResumeDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<{ resume: ResumeDetail; draftCandidateCreated: boolean }>> {
    if (!file) throw new BadRequestException('Multipart field "file" is required');
    const result = await this.resumes.upload(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      dto,
      user,
    );
    return ok(result, req.requestId);
  }

  // ── GET /resumes/:id ──────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions(Permission.RESUMES_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<ResumeDetail>> {
    const resume = await this.resumes.findById(id, user.organizationId);
    return ok(resume, req.requestId);
  }

  // ── PATCH /resumes/:id ────────────────────────────────────────────────────

  @Patch(':id')
  @RequirePermissions(Permission.RESUMES_UPDATE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResumeDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<ResumeDetail>> {
    const resume = await this.resumes.update(id, dto, user);
    return ok(resume, req.requestId);
  }

  // ── DELETE /resumes/:id ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.RESUMES_DELETE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.resumes.softDelete(id, user);
  }

  // ── POST /resumes/:id/versions  (multipart) ───────────────────────────────

  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.RESUMES_UPDATE)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MULTER_MAX_BYTES } }))
  async uploadNewVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: MulterFile | undefined,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<ResumeDetail>> {
    if (!file) throw new BadRequestException('Multipart field "file" is required');
    const resume = await this.resumes.uploadNewVersion(
      id,
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      user,
    );
    return ok(resume, req.requestId);
  }

  // ── GET /resumes/:id/versions/:vid/download ───────────────────────────────

  @Get(':id/versions/:vid/download')
  @RequirePermissions(Permission.RESUMES_DOWNLOAD)
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vid', ParseUUIDPipe) vid: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { data, contentType, fileName } = await this.resumes.download(id, vid, user, {
      ip: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });
    // RFC 5987 — quote the filename so spaces and unicode survive transport.
    const safeName = encodeURIComponent(fileName);
    res
      .setHeader('Content-Type', contentType)
      .setHeader('Content-Length', data.length.toString())
      .setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"; filename*=UTF-8''${safeName}`,
      )
      .send(data);
  }

  // ── GET /resumes/:id/versions/:vid/access-log ─────────────────────────────

  @Get(':id/versions/:vid/access-log')
  @RequirePermissions(Permission.RESUMES_READ)
  async getAccessLog(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('vid', ParseUUIDPipe) vid: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const log = await this.resumes.getAccessLog(vid, user.organizationId);
    return ok(log, req.requestId);
  }
}

// ── Intake batches ────────────────────────────────────────────────────────────

@Controller('resume-intake-batches')
export class ResumeIntakeBatchesController {
  constructor(private readonly resumes: ResumesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.RESUMES_CREATE)
  async create(
    @Body() dto: CreateIntakeBatchDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const batch = await this.resumes.createBatch(dto, user);
    return ok(batch, req.requestId);
  }
}
