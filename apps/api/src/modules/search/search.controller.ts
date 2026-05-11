import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok } from '../../common/helpers/response.helper';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  async search(
    @CurrentUser() user: RequestUser,
    @Query('q') q = '',
    @Query('limit') limit = '5',
    @Req() req: Request,
  ) {
    const perTypeLimit = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 20);
    const results = await this.service.search(user, q, perTypeLimit);
    return ok(results, req.requestId);
  }
}
