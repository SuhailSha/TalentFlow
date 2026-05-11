import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../../common/helpers/response.helper';
import { OrganizationService } from './organization.service';
import { UpdateOrgProfileDto } from './dto/update-org-profile.dto';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Get()
  @RequirePermissions(Permission.ORG_READ)
  async getProfile(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.getProfile(user), req.requestId);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.ORG_UPDATE)
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateOrgProfileDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.updateProfile(user, dto), req.requestId);
  }

  @Get('settings')
  @RequirePermissions(Permission.SETTINGS_READ)
  async getSettings(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.getSettings(user), req.requestId);
  }

  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async updateSettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateOrgSettingsDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.updateSettings(user, dto), req.requestId);
  }
}
