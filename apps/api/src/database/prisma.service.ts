import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@repo/database';

/**
 * NestJS-managed Prisma client.
 *
 * Extends PrismaClient so every domain service can inject PrismaService and
 * call this.prisma.user.findMany(), this.prisma.organization.create(), etc.
 * directly — no need to unwrap a nested client property.
 *
 * Lifecycle:
 *   onModuleInit    → $connect()   called once when the NestJS app boots
 *   onModuleDestroy → $disconnect() called on graceful shutdown (SIGTERM/SIGINT)
 *
 * Health checking:
 *   checkHealth() executes a lightweight SELECT 1 to verify the DB is reachable.
 *   Used by DatabaseHealthIndicator for the /health readiness probe.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env['NODE_ENV'] === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (err) {
      this.logger.error('Database connection failed — app will be unhealthy');
      this.logger.error(err);
      // Do not re-throw: let the app start so the health endpoint can report 503.
      // Kubernetes will restart the pod if the readiness probe stays unhealthy.
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Executes SELECT 1 to confirm the database is reachable.
   * Returns true on success, false on any error (connection refused, timeout, etc.).
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
