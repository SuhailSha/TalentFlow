import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton for Next.js and other long-lived server processes.
 *
 * Why globalThis:
 *   In development, Node.js module cache is cleared on each hot-reload
 *   (Next.js fast refresh, ts-node-dev). Without this pattern, every reload
 *   would create a new PrismaClient, exhaust the PostgreSQL connection pool,
 *   and emit "too many clients" errors.
 *
 * In NestJS the PrismaService manages its own lifecycle via OnModuleInit /
 * OnModuleDestroy and should NOT use this singleton. Import PrismaClient
 * directly from @prisma/client and extend it in PrismaService.
 *
 * Export name is `db` (not `prisma`) to avoid clashing with the Prisma
 * namespace itself and to keep import statements self-documenting:
 *   import { db } from '@repo/database';
 */

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  return new PrismaClient({
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

export const db: PrismaClient = globalThis.__prisma ?? createClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__prisma = db;
}
