-- ─── Migration: Add DRAFT to candidate_status enum ───────────────────────────
--
-- Phase C R1 introduces draft candidates created at resume-upload time.
-- The Resume Intelligence flow always binds a resume to a candidate; when
-- the recruiter doesn't pick an existing one, we create Candidate(status=DRAFT)
-- as part of the upload transaction.
--
-- Idempotent: ALTER TYPE ... ADD VALUE silently no-ops if the value exists
-- in newer Postgres; we catch the error for older versions.

DO $$
BEGIN
  ALTER TYPE candidate_status ADD VALUE 'DRAFT' BEFORE 'ACTIVE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
