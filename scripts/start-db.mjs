/**
 * start-db.mjs — starts embedded PostgreSQL for local development
 *
 * Usage:  node scripts/start-db.mjs
 *
 * This script:
 *   1. Starts an embedded PostgreSQL instance on port 5432
 *   2. Creates the `recruitment_dev` database if it doesn't exist
 *   3. Keeps running until Ctrl+C
 *
 * Data is stored in: .pg-data/  (gitignored)
 * No Docker required.
 */

import { EmbeddedPostgres } from 'embedded-postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '.pg-data');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,          // keep data between restarts
  initdbFlags: ['--auth=trust', '--auth-local=trust'],
});

async function main() {
  console.log('🐘  Starting embedded PostgreSQL...');
  console.log(`    Data dir : ${dataDir}`);
  console.log('    Host     : localhost:5432');
  console.log('    User     : postgres / postgres\n');

  await pg.initialise();
  await pg.start();
  console.log('✅  PostgreSQL started.\n');

  // Create the development database if missing
  const client = pg.getPgClient();
  await client.connect();

  const result = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = 'recruitment_dev'`
  );

  if (result.rowCount === 0) {
    await client.query('CREATE DATABASE recruitment_dev');
    console.log('📦  Database "recruitment_dev" created.\n');
  } else {
    console.log('📦  Database "recruitment_dev" already exists.\n');
  }

  await client.end();

  console.log('──────────────────────────────────────────────────────');
  console.log('  PostgreSQL is running. Press Ctrl+C to stop.');
  console.log('  Now run in another terminal:');
  console.log('    pnpm db:generate');
  console.log('    pnpm db:migrate');
  console.log('    pnpm db:seed');
  console.log('    pnpm dev');
  console.log('──────────────────────────────────────────────────────\n');

  // Keep alive until Ctrl+C
  process.on('SIGINT', async () => {
    console.log('\n🛑  Stopping PostgreSQL...');
    await pg.stop();
    console.log('   Done.');
    process.exit(0);
  });

  // Prevent process exit
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('❌  Failed to start PostgreSQL:', err);
  process.exit(1);
});
