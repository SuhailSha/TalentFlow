import {
  Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions/permissions';
import { ok } from '../common/helpers/response.helper';
import { QueueMonitorService } from './queue-monitor.service';
import type { QueueName } from './queue.constants';

@Controller('queue')
export class QueueController {
  constructor(private readonly service: QueueMonitorService) {}

  /** Cross-queue health snapshot. Safe to call when Redis is disabled. */
  @Get('health')
  @RequirePermissions(Permission.SETTINGS_READ)
  async health(@Req() req: Request) {
    return ok(await this.service.getAllStats(), req.requestId);
  }

  /** List failed jobs for inspection / retry. */
  @Get('failed-jobs')
  @RequirePermissions(Permission.SETTINGS_READ)
  async failedJobs(
    @Query('queueName') queueName: QueueName,
    @Query('limit') limitStr = '20',
    @Req() req: Request,
  ) {
    const limit = parseInt(limitStr, 10) || 20;
    return ok(await this.service.getFailedJobs(queueName, limit), req.requestId);
  }

  /** Re-enqueue a failed job. BullMQ resets attemptsMade and re-runs. */
  @Post('failed-jobs/:queueName/:jobId/retry')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async retry(
    @Param('queueName') queueName: QueueName,
    @Param('jobId') jobId: string,
    @Req() req: Request,
  ) {
    await this.service.retryFailedJob(queueName, jobId);
    return ok({ retried: true }, req.requestId);
  }

  /** Permanently remove a failed job. Cannot be undone. */
  @Delete('failed-jobs/:queueName/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  async remove(
    @Param('queueName') queueName: QueueName,
    @Param('jobId') jobId: string,
  ) {
    await this.service.removeFailedJob(queueName, jobId);
  }
}
