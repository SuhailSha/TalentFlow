import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../../common/helpers/response.helper';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('command-center')
  async commandCenter(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.commandCenter(user), req.requestId);
  }
}
