const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5432, database: 'recruitment_dev', user: 'postgres', password: 'postgres' });
client.connect()
  .then(() => client.query("SELECT u.email, u.first_name, u.last_name, o.slug FROM users u JOIN organizations o ON u.organization_id = o.id WHERE o.slug = 'acme' ORDER BY u.created_at LIMIT 5"))
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); client.end(); })
  .catch(err => { console.error(err.message); client.end(); });
