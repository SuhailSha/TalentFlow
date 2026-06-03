// ─── RLS PoC teardown ──────────────────────────────────────────────────────
// Drops the rls_poc schema. Roles are left intact (cluster-wide objects;
// dropping them would affect any other session that may have used them).

const path = require('path');
const { Client } = require(path.join(
  __dirname, '..', '..', '..', 'node_modules', '.pnpm', 'pg@8.20.0', 'node_modules', 'pg',
));

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/recruitment_dev';

(async () => {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  await client.query('DROP SCHEMA IF EXISTS rls_poc CASCADE');
  await client.end();
  console.log('[teardown] rls_poc schema dropped (roles retained)');
})().catch((err) => {
  console.error('[teardown] FATAL:', err);
  process.exit(1);
});
