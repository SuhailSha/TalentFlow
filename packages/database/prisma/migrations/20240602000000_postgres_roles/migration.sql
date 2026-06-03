-- ─── Migration: Postgres roles for RLS-bound multi-tenancy ─────────────────
-- TF-1-1. Per ADR-002 §7 and ADR-006 §13.
--
-- Roles created (cluster-wide objects; safe to re-run):
--   app_tenant         — RLS-bound. Used by API requests + tenant jobs.
--   app_admin          — BYPASSRLS. Used by `prismaAdmin` for cross-tenant
--                        maintenance (audit archival, retention purge,
--                        tenant onboarding). Every connection audited.
--   app_migrations     — BYPASSRLS. Used by Prisma migrate ONLY.
--   app_audit_archiver — BYPASSRLS. Authorized to delete from audit_logs
--                        (recognized by the append-only guard trigger).
--
-- NOTE: this migration runs as the cluster owner / migration role and
-- creates only the role objects themselves. GRANTs on individual tables
-- are issued by the table-creation migrations or, for existing tables, by
-- TF-1-2. Production credentials for these roles are provisioned via
-- Terraform once the AWS stack lands (TF-1-1 follow-up).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_tenant') THEN
    CREATE ROLE app_tenant NOLOGIN;
    COMMENT ON ROLE app_tenant IS
      'RLS-bound role used by all API requests and tenant-scoped background jobs. '
      'Cannot bypass row-level security. Tenant context set via SET LOCAL '
      'app.current_org_id within each transaction. See ADR-002.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin NOLOGIN BYPASSRLS;
    COMMENT ON ROLE app_admin IS
      'Bypasses RLS for cross-tenant maintenance work only. Connections via '
      'prismaAdmin client are audited in OpenTelemetry. Forbidden for normal '
      'request paths.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_migrations') THEN
    CREATE ROLE app_migrations NOLOGIN BYPASSRLS CREATEROLE;
    COMMENT ON ROLE app_migrations IS
      'Used by Prisma migrate. Bypasses RLS so migrations can create + alter '
      'tenant-scoped tables. Never used for application traffic.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_audit_archiver') THEN
    CREATE ROLE app_audit_archiver NOLOGIN BYPASSRLS;
    COMMENT ON ROLE app_audit_archiver IS
      'Authorized to DELETE from audit_logs during retention purges. The '
      'append-only guard trigger (audit_logs_append_only_guard) explicitly '
      'whitelists this role. No other code path should ever delete audit data.';
  END IF;
END $$;

-- Defense in depth: the app_tenant role must NOT have CREATEROLE, SUPERUSER,
-- or BYPASSRLS. We don't grant these on creation; this DO block double-checks.
DO $$
DECLARE
  r RECORD;
BEGIN
  SELECT rolcreaterole, rolsuper, rolbypassrls
    INTO r
    FROM pg_roles
   WHERE rolname = 'app_tenant';
  IF r.rolcreaterole OR r.rolsuper OR r.rolbypassrls THEN
    RAISE EXCEPTION 'app_tenant role has elevated privileges; this is a bug. '
                    'CREATEROLE=% SUPER=% BYPASSRLS=%',
                    r.rolcreaterole, r.rolsuper, r.rolbypassrls;
  END IF;
END $$;

-- Validation: all four roles must exist after this migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_tenant')          THEN
    RAISE EXCEPTION 'TF-1-1 migration failed: app_tenant role missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin')           THEN
    RAISE EXCEPTION 'TF-1-1 migration failed: app_admin role missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_migrations')      THEN
    RAISE EXCEPTION 'TF-1-1 migration failed: app_migrations role missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_audit_archiver')  THEN
    RAISE EXCEPTION 'TF-1-1 migration failed: app_audit_archiver role missing'; END IF;
END $$;
