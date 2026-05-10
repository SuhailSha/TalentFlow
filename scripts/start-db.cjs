/**
 * start-db.cjs — starts embedded PostgreSQL for local development
 */
'use strict';

const { default: EmbeddedPostgres } = require('embedded-postgres');
const path = require('path');

const dataDir = path.join(__dirname, '..', '.pg-data');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
});

async function main() {
  console.log('🐘  Starting embedded PostgreSQL...');
  console.log('    Data dir :', dataDir);
  console.log('    Host     : localhost:5432');
  console.log('    User     : postgres / postgres\n');

  await pg.initialise();
  await pg.start();
  console.log('✅  PostgreSQL started.\n');

  const client = pg.getPgClient();
  await client.connect();

  const result = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = 'recruitment_dev'"
  );

  if (result.rowCount === 0) {
    await client.query('CREATE DATABASE recruitment_dev');
    console.log('📦  Database "recruitment_dev" created.\n');
  } else {
    console.log('📦  Database "recruitment_dev" already exists.\n');
  }

  await client.end();

  console.log('──────────────────────────────────────────────────────');
  console.log('  PostgreSQL running on localhost:5432');
  console.log('  Keep this terminal open. Press Ctrl+C to stop.');
  console.log('──────────────────────────────────────────────────────\n');

  process.on('SIGINT', async () => {
    console.log('\n🛑  Stopping PostgreSQL...');
    await pg.stop();
    process.exit(0);
  });

  await new Promise(() => {});
}

main().catch((err) => {
  console.error('❌  Failed to start PostgreSQL:', err);
  process.exit(1);
});
