-- ── PoC seed data ─────────────────────────────────────────────────────────
-- Two tenants, one candidate each. The fixed UUIDs are intentional so the
-- test script can reference them directly without round-tripping.

-- Seed runs as the migration role (bypasses RLS). Tenants and candidates
-- are linked via organization_id.

INSERT INTO rls_poc.organizations (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tenant A')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rls_poc.organizations (id, name) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Tenant B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rls_poc.candidates (id, organization_id, email, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'alice@tenant-a.test', 'Alice (Tenant A)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rls_poc.candidates (id, organization_id, email, name) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '22222222-2222-2222-2222-222222222222',
   'bob@tenant-b.test', 'Bob (Tenant B)')
ON CONFLICT (id) DO NOTHING;
