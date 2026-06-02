import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../../common/helpers/response.helper';
import { UpdateExtractionConfigDto } from './dto/update-extraction-config.dto';
import { ExtractionConfigService } from './extraction-config.service';

@Controller('organization/extraction-config')
export class ExtractionConfigController {
  constructor(private readonly service: ExtractionConfigService) {}

  @Get()
  @RequirePermissions(Permission.EXTRACTION_CONFIG_READ)
  async get(@CurrentUser() user: RequestUser, @Req() req: Request) {
    const config = await this.service.get(user.organizationId);
    return ok(config, req.requestId);
  }

  @Get('defaults')
  @RequirePermissions(Permission.EXTRACTION_CONFIG_READ)
  async getDefaults(@Req() req: Request) {
    return ok(this.service.getDefaults(), req.requestId);
  }

  @Put()
  @RequirePermissions(Permission.EXTRACTION_CONFIG_UPDATE)
  async update(
    @Body() dto: UpdateExtractionConfigDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const config = await this.service.update(user.organizationId, dto, user);
    return ok(config, req.requestId);
  }
}
