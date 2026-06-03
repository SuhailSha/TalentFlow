-- ─── Migration: Row-Level Security on every tenant-scoped table ────────────
-- TF-1-2. Per ADR-001 / ADR-002.
--
-- For each table with an `organization_id` column:
--   1. GRANT DML to app_tenant (read/insert/update/delete).
--   2. ENABLE + FORCE row-level security.
--   3. Create a single policy `<table>_tenant_isolation` that filters
--      USING and WITH CHECK against the session GUC `app.current_org_id`.
--
-- The policy uses NULLIF(current_setting(...), '')::uuid to handle the
-- Postgres "GUC persists as empty string" quirk caught by the PoC
-- (see packages/rls-poc/REPORT.md Finding 1). When the GUC is unset or
-- empty, the policy returns zero rows — the safe failure mode.
--
-- app_admin and app_migrations have BYPASSRLS at the role level; policies
-- do not apply to them. app_audit_archiver also has BYPASSRLS so retention
-- workers can clean across tenants.
--
-- A DO block at the end validates that every expected table has the
-- policy attached. A missed table is a hard failure.

-- A helper that compiles down to the same 5 statements for every table.
DO $$
DECLARE
  tbl_name text;
  tenant_tables text[] := ARRAY[
    -- ── Organization-attached ──
    'users', 'roles', 'user_roles', 'user_invitations',
    'organization_settings', 'recruiter_profiles',
    'subscriptions', 'usage_records',
    -- ── Recruit domain ──
    'candidates', 'candidate_notes',
    'job_descriptions', 'job_notes',
    'submissions', 'submission_notes',
    'interviews', 'interview_feedback', 'interview_notes',
    'reminders', 'reminder_activities',
    'notifications',
    -- ── Vendor domain ──
    'vendors', 'vendor_contacts', 'vendor_notes',
    -- ── Resume Intelligence ──
    'resumes', 'resume_versions', 'resume_intake_batches',
    'resume_access_logs', 'parsing_jobs', 'extraction_results',
    'review_tasks', 'organization_extraction_configs',
    'duplicate_detection_runs', 'duplicate_candidate_matches',
    -- ── Communications ──
    'email_deliveries',
    -- ── Audit (kept here for RLS even though append-only via trigger) ──
    'audit_logs'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tenant_tables LOOP
    -- Sanity: skip silently if the table doesn't exist (forward-compatibility
    -- with seeds that may not have every table provisioned in dev).
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      RAISE NOTICE 'TF-1-2: skipping %, not present in this database', tbl_name;
      CONTINUE;
    END IF;

    -- Grant DML to the tenant role. The migration role retains its own
    -- privileges; production application connections use app_tenant.
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO app_tenant', tbl_name);

    -- Enable + force RLS. FORCE applies the policy to the table owner too
    -- (without it, the owner — typically the migration role — would bypass).
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl_name);

    -- Drop any prior policy and recreate with the canonical shape.
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON %I', tbl_name, tbl_name);
    EXECUTE format($p$
      CREATE POLICY %I_tenant_isolation ON %I
        FOR ALL
        TO app_tenant
        USING      (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    $p$, tbl_name, tbl_name);
  END LOOP;
END $$;

-- ── Validation ─────────────────────────────────────────────────────────────
-- Every table in the list above MUST have its policy attached. A missing
-- policy after this migration is a deploy-blocking bug.
DO $$
DECLARE
  expected text;
  expected_tables text[] := ARRAY[
    'users', 'roles', 'user_roles', 'user_invitations',
    'organization_settings', 'recruiter_profiles',
    'subscriptions', 'usage_records',
    'candidates', 'candidate_notes',
    'job_descriptions', 'job_notes',
    'submissions', 'submission_notes',
    'interviews', 'interview_feedback', 'interview_notes',
    'reminders', 'reminder_activities',
    'notifications',
    'vendors', 'vendor_contacts', 'vendor_notes',
    'resumes', 'resume_versions', 'resume_intake_batches',
    'resume_access_logs', 'parsing_jobs', 'extraction_results',
    'review_tasks', 'organization_extraction_configs',
    'duplicate_detection_runs', 'duplicate_candidate_matches',
    'email_deliveries',
    'audit_logs'
  ];
  missing text[] := ARRAY[]::text[];
BEGIN
  FOREACH expected IN ARRAY expected_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = expected
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = expected
         AND policyname = expected || '_tenant_isolation'
    ) THEN
      missing := array_append(missing, expected);
    END IF;
  END LOOP;
  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'TF-1-2 validation failed: tables missing tenant isolation policy: %', missing;
  END IF;
END $$;
