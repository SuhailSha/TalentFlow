-- ── RLS policies ───────────────────────────────────────────────────────────
-- Per ADR-002 §6. Policies read the session GUC `app.current_org_id`,
-- set per transaction via `SET LOCAL`.
--
-- ⚠ Important PoC finding (2026-06-03): Postgres GUCs that have been set
--   at least once in a session persist as an *empty string* across
--   subsequent transactions, even when SET LOCAL was used. So a naive
--   `current_setting('app.current_org_id', true)::uuid` raises
--   `invalid input syntax for type uuid: ""` rather than returning NULL.
--
--   Fix: wrap with `NULLIF(..., '')` so the empty-string case is treated
--   as NULL, which the policy then correctly rejects (NULL = uuid →
--   unknown → row filtered out). The safe failure mode (zero rows) is
--   preserved.
--
--   This finding is the single most important reason a PoC exists. The
--   production middleware in apps/api/src/database/ ships with the
--   NULLIF wrapper from day one. See packages/rls-poc/REPORT.md.

ALTER TABLE rls_poc.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rls_poc.candidates FORCE ROW LEVEL SECURITY;

ALTER TABLE rls_poc.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rls_poc.organizations FORCE ROW LEVEL SECURITY;

-- Candidates policy: read/write only rows where organization_id matches
-- the active GUC.
DROP POLICY IF EXISTS candidates_tenant_isolation ON rls_poc.candidates;
CREATE POLICY candidates_tenant_isolation ON rls_poc.candidates
  FOR ALL
  TO rls_poc_tenant
  USING      (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

-- Organizations policy: each tenant can see their own row only.
DROP POLICY IF EXISTS organizations_self ON rls_poc.organizations;
CREATE POLICY organizations_self ON rls_poc.organizations
  FOR ALL
  TO rls_poc_tenant
  USING      (id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

-- rls_poc_admin has BYPASSRLS at the role level so policies do not apply.
-- No explicit policy needed for it.
