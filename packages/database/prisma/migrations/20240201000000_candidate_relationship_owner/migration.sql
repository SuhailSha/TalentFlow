-- ─── Migration: Candidate.relationshipOwnerId (Workspace Refactor) ───────────
--
-- Adds a "primary recruiter" to Candidate, mirroring Vendor.relationshipOwnerId
-- and JobDescription.hiringManagerId. Backfilled to createdBy for existing
-- rows so the workspace's owner card always has something to render.

ALTER TABLE "candidates"
  ADD COLUMN IF NOT EXISTS "relationship_owner_id" UUID;

-- Backfill: each existing candidate's owner = whoever created them.
-- Safe to re-run because we only fill NULL values.
UPDATE "candidates"
   SET "relationship_owner_id" = "created_by"
 WHERE "relationship_owner_id" IS NULL
   AND "created_by" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "candidates_organization_id_relationship_owner_id_idx"
  ON "candidates" (organization_id, relationship_owner_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'candidates' AND column_name = 'relationship_owner_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: relationship_owner_id column not created';
  END IF;
END $$;
