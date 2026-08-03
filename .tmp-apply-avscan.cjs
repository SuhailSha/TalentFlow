const fs = require('fs');
const path = require('path');
const { Client } = require('./node_modules/.pnpm/pg@8.20.0/node_modules/pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/recruitment_dev' });
  try { await c.connect(); } catch (e) { console.log('PG unreachable, skipping apply (will run in staging):', e.code); return; }
  const sql = fs.readFileSync(path.join(__dirname,
    'packages/database/prisma/migrations/20240604000000_resume_av_scan/migration.sql'), 'utf8');
  try {
    await c.query(sql);
    const r = await c.query(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'resume_versions' AND column_name LIKE 'scan_%'
        ORDER BY ordinal_position`);
    console.log('scan_* columns:');
    for (const row of r.rows) console.log(`  ${row.column_name.padEnd(24)} ${row.data_type}`);
  } catch (e) { console.error('Apply failed:', e.message); }
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
