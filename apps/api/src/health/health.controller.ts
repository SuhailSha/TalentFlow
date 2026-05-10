import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import { Public } from '../auth/decorators/public.decorator';
import { DatabaseHealthIndicator } from './indicators/database.health-indicator';

// Health probes are infrastructure endpoints — no auth required.
// @Public() opts them out of the global JwtAuthGuard.
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  /** Kubernetes readiness probe — returns 503 when dependencies are down */
  @Get()
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.db.check('database')]);
  }

  /** Kubernetes liveness probe — always 200 while the process is alive */
  @Get('liveness')
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Basic API info endpoint */
  @Get('info')
  info() {
    return {
      name: 'Recruitment Platform API',
      version: '1.0.0',
      environment: process.env['NODE_ENV'] ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
