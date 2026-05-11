import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../helpers/response.helper';
import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  @Get(':entityType/:id')
  async forEntity(
    @CurrentUser() user: RequestUser,
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Query('limit') limit = '50',
    @Req() req: Request,
  ) {
    const entries = await this.service.assembleForEntity(
      entityType,
      id,
      user.organizationId,
      Math.min(parseInt(limit, 10) || 50, 200),
    );
    return ok(entries, req.requestId);
  }
}
