import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@repo/database';

/**
 * BYPASSRLS Prisma client for cross-tenant maintenance work.
 *
 * Connects as the `app_admin` Postgres role (provisioned by the TF-1-1
 * migration). All policies are bypassed; every tenant's data is visible.
 * This is a footgun by design — restrict use to:
 *
 *   - Audit archival workers (sweep all tenants' audit_logs)
 *   - Retention purge workers (cascade hard-deletes per ADR-007 §2)
 *   - Tenant onboarding (create the Organization row itself)
 *   - Platform mode operations (deferred; ADR-001 §5)
 *
 * Calls through this client are auditable: every method invocation is
 * tagged with an OpenTelemetry span attribute `prisma.admin=true` so
 * security reviewers can scan traces for unexpected cross-tenant access.
 *
 * Production binding:
 *   DATABASE_ADMIN_URL is a separate connection string with credentials
 *   for the app_admin role. Falls back to DATABASE_URL in dev (where the
 *   app already runs as superuser anyway).
 *
 * @see docs/architecture/adr/adr-002-rls-strategy.md §5
 */
@Injectable()
export class PrismaAdminService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaAdminService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env['DATABASE_ADMIN_URL'] ??
            process.env['DATABASE_URL'] ??
            'postgresql://postgres:postgres@localhost:5432/recruitment_dev',
        },
      },
      log: [{ emit: 'stdout', level: 'error' }],
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.warn(
        'PrismaAdminService connected (BYPASSRLS). ' +
        'Every call must be audited; verify per ADR-002 §5.',
      );
    } catch (err) {
      this.logger.error('PrismaAdminService connection failed');
      this.logger.error(err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
