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
import { VendorsService } from './vendors.service';
import { CreateVendorContactDto } from './dto/create-vendor-contact.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { CreateVendorNoteDto } from './dto/create-vendor-note.dto';
import { ListVendorsDto } from './dto/list-vendors.dto';
import { TransitionVendorStatusDto } from './dto/transition-vendor-status.dto';
import { UpdateVendorContactDto } from './dto/update-vendor-contact.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import type { VendorDetail, VendorListItem } from './types/vendor.types';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ── GET /vendors ───────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.VENDORS_READ)
  async list(
    @Query() dto: ListVendorsDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<PaginatedResponse<VendorListItem>> {
    const { vendors, total } = await this.vendorsService.findMany(user.organizationId, dto);
    return paginated(vendors, { total, page: dto.page, limit: dto.limit }, req.requestId);
  }

  // ── POST /vendors ──────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.VENDORS_CREATE)
  async create(
    @Body() dto: CreateVendorDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<{ vendor: VendorDetail; potentialDuplicates: unknown[] }>> {
    const result = await this.vendorsService.create(dto, user);
    return ok(result, req.requestId);
  }

  // ── GET /vendors/:id ───────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions(Permission.VENDORS_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<VendorDetail>> {
    const vendor = await this.vendorsService.findById(id, user.organizationId);
    return ok(vendor, req.requestId);
  }

  // ── PATCH /vendors/:id ─────────────────────────────────────────────────────

  @Patch(':id')
  @RequirePermissions(Permission.VENDORS_UPDATE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<VendorDetail>> {
    const vendor = await this.vendorsService.update(id, dto, user);
    return ok(vendor, req.requestId);
  }

  // ── DELETE /vendors/:id ────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.VENDORS_DELETE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.vendorsService.softDelete(id, user);
  }

  // ── PUT /vendors/:id/status ────────────────────────────────────────────────

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.VENDORS_UPDATE)
  async transitionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionVendorStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponse<VendorDetail>> {
    const vendor = await this.vendorsService.transitionStatus(id, dto, user);
    return ok(vendor, req.requestId);
  }

  // ── POST /vendors/:id/contacts ─────────────────────────────────────────────

  @Post(':id/contacts')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.VENDORS_UPDATE)
  async addContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVendorContactDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const contact = await this.vendorsService.addContact(id, dto, user);
    return ok(contact, req.requestId);
  }

  // ── PATCH /vendors/:id/contacts/:contactId ─────────────────────────────────

  @Patch(':id/contacts/:contactId')
  @RequirePermissions(Permission.VENDORS_UPDATE)
  async updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateVendorContactDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const contact = await this.vendorsService.updateContact(id, contactId, dto, user);
    return ok(contact, req.requestId);
  }

  // ── DELETE /vendors/:id/contacts/:contactId ────────────────────────────────

  @Delete(':id/contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.VENDORS_UPDATE)
  async removeContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.vendorsService.removeContact(id, contactId, user);
  }

  // ── POST /vendors/:id/notes ────────────────────────────────────────────────

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.VENDORS_UPDATE)
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVendorNoteDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const note = await this.vendorsService.addNote(id, dto, user);
    return ok(note, req.requestId);
  }

  // ── GET /vendors/:id/notes ─────────────────────────────────────────────────

  @Get(':id/notes')
  @RequirePermissions(Permission.VENDORS_READ)
  async getNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const notes = await this.vendorsService.getNotes(id, user);
    return ok(notes, req.requestId);
  }
}
