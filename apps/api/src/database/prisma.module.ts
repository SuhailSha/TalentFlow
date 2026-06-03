import { Global, Module } from '@nestjs/common';

import { PrismaAdminService } from './prisma-admin.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  // Two clients exported:
  //   PrismaService      — RLS-bound; default for application services.
  //   PrismaAdminService — BYPASSRLS; only for cross-tenant maintenance.
  // The RLS-guard extension (`withRls`) is opt-in per service to avoid
  // forcing a context on internal lifecycle paths.
  providers: [PrismaService, PrismaAdminService],
  exports:   [PrismaService, PrismaAdminService],
})
export class DatabaseModule {}
