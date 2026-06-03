-- ─── Migration: Make `audit_logs` append-only at the database layer ────────
--
-- Per ADR-007 §8 and the architecture review. The application already treats
-- audit_logs as append-only; this migration enforces it at the database so
-- a bug, runaway script, or compromised app credential cannot mutate or
-- delete audit history.
--
-- Implementation:
--   1. Revoke UPDATE and DELETE on audit_logs from the application role.
--   2. Reads remain allowed. INSERTs remain allowed.
--   3. A separate role (`app_admin`) keeps full access for archival jobs
--      that move old partitions to S3 per the retention policy.
--   4. A guard trigger blocks UPDATE/DELETE if it somehow gets through
--      (defense in depth — superuser or postgres role would bypass GRANTs
--      otherwise).
--
-- The `app_user` role is the canonical name we adopt for the application's
-- Postgres role. If your environment uses a different role name, edit
-- the `current_user_name` constant below.

-- ── Step 1: Revoke mutation grants from the app role ──────────────────────
-- We do NOT issue this for the cluster owner (which is the role that runs
-- migrations); that role retains UPDATE/DELETE so migrations themselves can
-- still alter schema. For column changes to audit_logs the migration runner
-- is the only privileged actor.

DO $$
DECLARE
  v_app_role text := COALESCE(current_setting('app.app_role_name', true), 'app_user');
BEGIN
  -- Only revoke if the role exists; in dev with a single role this is a no-op.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_app_role) THEN
    EXECUTE format('REVOKE UPDATE, DELETE ON TABLE audit_logs FROM %I', v_app_role);
  END IF;
END $$;

-- ── Step 2: Defense-in-depth trigger ──────────────────────────────────────
-- Even with GRANTs revoked, a connection authenticated as the table owner
-- (e.g., the migration runner role) could still mutate. This trigger
-- enforces append-only for everyone except the explicit archival role
-- `app_audit_archiver`, which we create alongside the production cluster.

CREATE OR REPLACE FUNCTION audit_logs_append_only_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow the dedicated archival role to delete old rows during retention
  -- purges. Everything else is rejected with a clear error message.
  IF current_user = 'app_audit_archiver' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'audit_logs is append-only. UPDATE/DELETE attempted by role "%". '
    'Use the archival worker (role app_audit_archiver) for retention purges.',
    current_user
    USING ERRCODE = 'insufficient_privilege';
END
$$;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only_guard();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only_guard();

-- ── Step 3: Comment for future maintainers ────────────────────────────────
COMMENT ON TABLE audit_logs IS
  'Append-only by policy and database trigger (audit_logs_append_only_guard). '
  'Mutation attempts raise insufficient_privilege. Retention purges use role '
  'app_audit_archiver. See docs/architecture/adr/adr-007-gdpr-strategy.md §8.';

-- ── Step 4: Validate ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname IN ('audit_logs_no_update', 'audit_logs_no_delete')
  ) THEN
    RAISE EXCEPTION 'Migration failed: append-only triggers not created';
  END IF;
END $$;
