-- ─── Migration: Duplicate Detection (Phase C — R4) ───────────────────────────
-- Two new tables + four enums. Builds on R3 (ReviewTask) but is logically
-- candidate-domain. Detection runs run BEFORE candidate promotion; matches
-- carry their own decision lifecycle.

DO $$ BEGIN
  CREATE TYPE duplicate_run_status AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE duplicate_run_trigger AS ENUM ('REVIEW_APPROVE', 'MANUAL_SCAN', 'API_BATCH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE duplicate_confidence_tier AS ENUM ('EXACT', 'PROBABLE', 'POSSIBLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE duplicate_match_status AS ENUM (
    'PENDING', 'NOT_DUPLICATE', 'DEFERRED', 'SUPERSEDED', 'CONFIRMED_DUPLICATE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "duplicate_detection_runs" (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL,
  source_candidate_id  UUID NOT NULL,
  triggered_by         duplicate_run_trigger NOT NULL,
  triggered_by_id      UUID NOT NULL,
  review_task_id       UUID,
  status               duplicate_run_status NOT NULL DEFAULT 'RUNNING',
  total_matches        INT NOT NULL DEFAULT 0,
  exact_matches        INT NOT NULL DEFAULT 0,
  probable_matches     INT NOT NULL DEFAULT 0,
  possible_matches     INT NOT NULL DEFAULT 0,
  duration_ms          INT,
  error_message        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "duplicate_runs_org_source_created_idx"
  ON "duplicate_detection_runs" (organization_id, source_candidate_id, created_at);
CREATE INDEX IF NOT EXISTS "duplicate_runs_org_status_idx"
  ON "duplicate_detection_runs" (organization_id, status);
CREATE INDEX IF NOT EXISTS "duplicate_runs_review_task_idx"
  ON "duplicate_detection_runs" (review_task_id);

CREATE TABLE IF NOT EXISTS "duplicate_candidate_matches" (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id               UUID NOT NULL,
  organization_id      UUID NOT NULL,
  source_candidate_id  UUID NOT NULL,
  target_candidate_id  UUID NOT NULL,
  confidence_tier      duplicate_confidence_tier NOT NULL,
  confidence_score     DECIMAL(4, 3) NOT NULL DEFAULT 0,
  match_reasons        JSONB NOT NULL DEFAULT '[]'::jsonb,
  status               duplicate_match_status NOT NULL DEFAULT 'PENDING',
  decided_by_id        UUID,
  decided_at           TIMESTAMPTZ,
  decision_notes       TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "duplicate_matches_run_pair_key"
  ON "duplicate_candidate_matches" (run_id, source_candidate_id, target_candidate_id);
CREATE INDEX IF NOT EXISTS "duplicate_matches_org_status_created_idx"
  ON "duplicate_candidate_matches" (organization_id, status, created_at);
CREATE INDEX IF NOT EXISTS "duplicate_matches_org_source_status_idx"
  ON "duplicate_candidate_matches" (organization_id, source_candidate_id, status);
CREATE INDEX IF NOT EXISTS "duplicate_matches_org_target_idx"
  ON "duplicate_candidate_matches" (organization_id, target_candidate_id);
CREATE INDEX IF NOT EXISTS "duplicate_matches_org_tier_status_idx"
  ON "duplicate_candidate_matches" (organization_id, confidence_tier, status);

DO $$ BEGIN
  ALTER TABLE "duplicate_candidate_matches"
    ADD CONSTRAINT "duplicate_matches_run_id_fkey"
    FOREIGN KEY (run_id) REFERENCES "duplicate_detection_runs"(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'duplicate_detection_runs') THEN
    RAISE EXCEPTION 'duplicate_detection_runs table not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'duplicate_candidate_matches') THEN
    RAISE EXCEPTION 'duplicate_candidate_matches table not created';
  END IF;
END $$;
