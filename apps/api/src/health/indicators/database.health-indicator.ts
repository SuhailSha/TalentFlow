import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';

import { PrismaService } from '../../database';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Executes SELECT 1 against the database and returns a Terminus result.
   * Throws HealthCheckError (status 503) if the query fails.
   *
   * Called by HealthController.readiness() for the Kubernetes readiness probe.
   */
  async check(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.prisma.checkHealth();
    const result = this.getStatus(key, isHealthy);

    if (!isHealthy) {
      throw new HealthCheckError('Database is unreachable', result);
    }

    return result;
  }
}
