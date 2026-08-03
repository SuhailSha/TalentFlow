const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/recruitment_dev' });
  await c.connect();
  const r = await c.query("SELECT migration_name, finished_at IS NOT NULL AS finished, applied_steps_count FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10");
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
