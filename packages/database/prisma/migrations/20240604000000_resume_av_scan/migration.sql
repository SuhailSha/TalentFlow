-- ── Migration: Resume AV scan (TF-1-16) ───────────────────────────────────
-- Per ADR-006 §7 and the architecture review §12.
--
-- Every uploaded ResumeVersion carries a `scan_status` life-cycle:
--   PENDING -> SCANNING -> CLEAN | INFECTED | SCAN_TIMEOUT | SCAN_ERROR
--
-- Downloads are blocked for non-CLEAN files (enforced at the service
-- layer, not just the UI). INFECTED files stay in the quarantine
-- storage prefix and are never promoted to the main bucket.

CREATE TYPE "resume_scan_status" AS ENUM (
  'PENDING',
  'SCANNING',
  'CLEAN',
  'INFECTED',
  'SCAN_TIMEOUT',
  'SCAN_ERROR'
);

ALTER TABLE "resume_versions"
  ADD COLUMN IF NOT EXISTS "scan_status"        "resume_scan_status" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "scan_completed_at"  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "scan_provider"      VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "scan_signature_id"  VARCHAR(256),
  ADD COLUMN IF NOT EXISTS "scan_notes"         TEXT;

-- Backfill existing rows to CLEAN. Pre-existing versions were uploaded
-- before AV enforcement; forcing them to PENDING would break current
-- workflows. Any new upload starts at PENDING and passes through the
-- scanner. If tenants demand backfill scanning, run a one-off job that
-- resets to PENDING for their rows.
UPDATE "resume_versions" SET "scan_status" = 'CLEAN', "scan_provider" = 'legacy'
 WHERE "scan_status" = 'PENDING';

-- Support fast queries like "all versions still awaiting scan".
CREATE INDEX IF NOT EXISTS "resume_versions_scan_status_idx"
  ON "resume_versions" ("scan_status")
  WHERE "scan_status" IN ('PENDING', 'SCANNING');

-- Validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'resume_versions' AND column_name = 'scan_status'
  ) THEN
    RAISE EXCEPTION 'TF-1-16 migration failed: scan_status column missing';
  END IF;
END $$;

COMMENT ON COLUMN "resume_versions"."scan_status" IS
  'AV scan lifecycle. Downloads gated in ResumesService — only CLEAN is served.';
