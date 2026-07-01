import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types/request-user.interface';
import { ok } from '../common/helpers/response.helper';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * GET /flags — returns the current user's flag evaluations as a single
 * map. The frontend calls this once on app boot and stores the result;
 * `useFlag(key)` is a synchronous lookup against that map.
 *
 * The endpoint is intentionally low-latency (one Map lookup per flag in
 * the current resolver) so it can be called on every page navigation if
 * needed. Real GrowthBook adapter caches per-context evaluations.
 */
@Controller('flags')
export class FeatureFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Get()
  all(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(
      this.flags.all({
        organizationId: user.organizationId,
        userId:         user.userId,
        role:           user.roles?.[0],
      }),
      req.requestId,
    );
  }
}
