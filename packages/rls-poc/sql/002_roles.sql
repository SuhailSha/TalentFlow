-- ── PoC roles ──────────────────────────────────────────────────────────────
-- We need three roles per ADR-002 §7:
--   app_tenant     — RLS-bound; used by all API requests and tenant jobs
--   app_admin      — bypasses RLS (BYPASSRLS); used for cross-tenant ops
--   app_migrations — bypasses RLS; used only by Prisma migrate
--
-- In production these are distinct Postgres roles with separate credentials.
-- For the PoC we create them in the same cluster so we can switch between
-- them via SET ROLE.
--
-- IMPORTANT: the migration script creates these roles only if they do not
-- already exist; subsequent runs are idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_poc_tenant') THEN
    CREATE ROLE rls_poc_tenant NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_poc_admin') THEN
    CREATE ROLE rls_poc_admin NOLOGIN BYPASSRLS;
  END IF;
END $$;

-- Grant schema usage.
GRANT USAGE ON SCHEMA rls_poc TO rls_poc_tenant, rls_poc_admin;

-- Grants on the test tables. Note we do NOT grant CREATE / DROP — only DML.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON rls_poc.organizations, rls_poc.candidates
  TO rls_poc_tenant, rls_poc_admin;
