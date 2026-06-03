// ─── RLS PoC setup ─────────────────────────────────────────────────────────
// Applies the four SQL files (001 schema, 002 roles, 003 RLS, 004 seed) in
// order to a Postgres database. Idempotent: re-running drops and recreates
// the rls_poc schema. Roles are kept (CREATE ROLE IF NOT EXISTS pattern).

const fs   = require('fs');
const path = require('path');
const { Client } = require(path.join(
  __dirname, '..', '..', '..', 'node_modules', '.pnpm', 'pg@8.20.0', 'node_modules', 'pg',
));

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/recruitment_dev';

const SQL_FILES = ['001_schema.sql', '002_roles.sql', '003_rls.sql', '004_seed.sql'];

(async () => {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log(`[setup] connected to ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

  for (const file of SQL_FILES) {
    const filepath = path.join(__dirname, '..', 'sql', file);
    const sql = fs.readFileSync(filepath, 'utf8');
    console.log(`[setup] applying ${file} (${sql.length} chars)`);
    try {
      await client.query(sql);
      console.log(`[setup]   ✓ ${file} applied`);
    } catch (err) {
      console.error(`[setup]   ✗ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  await client.end();
  console.log('[setup] complete');
})().catch((err) => {
  console.error('[setup] FATAL:', err);
  process.exit(1);
});
