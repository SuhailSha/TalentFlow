-- ─── Migration: Resume Parsing pipeline (Phase C — R2) ────────────────────────
-- Two new tables + one enum. Builds on the R1 storage layer.

DO $$ BEGIN
  CREATE TYPE parsing_job_status AS ENUM (
    'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SUPERSEDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── ParsingJob ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "parsing_jobs" (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_version_id    UUID NOT NULL,
  organization_id      UUID NOT NULL,
  provider             resume_parser_provider NOT NULL,
  provider_version     VARCHAR(100),
  status               parsing_job_status NOT NULL DEFAULT 'QUEUED',
  attempt              INT NOT NULL DEFAULT 1,
  started_at           TIMESTAMPTZ,
  finished_at          TIMESTAMPTZ,
  duration_ms          INT,
  error_code           VARCHAR(64),
  error_message        TEXT,
  cost_usd             DECIMAL(10, 4),
  input_tokens         INT,
  output_tokens        INT,
  extraction_result_id UUID UNIQUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "parsing_jobs_resume_version_id_attempt_key"
  ON "parsing_jobs" (resume_version_id, attempt);
CREATE INDEX IF NOT EXISTS "parsing_jobs_organization_id_status_started_at_idx"
  ON "parsing_jobs" (organization_id, status, started_at);
CREATE INDEX IF NOT EXISTS "parsing_jobs_organization_id_provider_idx"
  ON "parsing_jobs" (organization_id, provider);
CREATE INDEX IF NOT EXISTS "parsing_jobs_organization_id_created_at_idx"
  ON "parsing_jobs" (organization_id, created_at);

-- ─── ExtractionResult ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "extraction_results" (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parsing_job_id      UUID NOT NULL UNIQUE,
  resume_version_id   UUID NOT NULL,
  organization_id     UUID NOT NULL,
  schema_version      INT NOT NULL DEFAULT 1,
  payload             JSONB NOT NULL,
  confidence          JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_confidence  DECIMAL(4, 3) NOT NULL DEFAULT 0,
  raw_text            TEXT,
  parser_metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "extraction_results_resume_version_id_idx"
  ON "extraction_results" (resume_version_id);
CREATE INDEX IF NOT EXISTS "extraction_results_organization_id_created_at_idx"
  ON "extraction_results" (organization_id, created_at);

-- ─── Foreign keys (added after both tables exist) ─────────────────────────────

DO $$ BEGIN
  ALTER TABLE "parsing_jobs"
    ADD CONSTRAINT "parsing_jobs_resume_version_id_fkey"
    FOREIGN KEY (resume_version_id) REFERENCES "resume_versions"(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "parsing_jobs"
    ADD CONSTRAINT "parsing_jobs_extraction_result_id_fkey"
    FOREIGN KEY (extraction_result_id) REFERENCES "extraction_results"(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "extraction_results"
    ADD CONSTRAINT "extraction_results_resume_version_id_fkey"
    FOREIGN KEY (resume_version_id) REFERENCES "resume_versions"(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Validation ───────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parsing_jobs') THEN
    RAISE EXCEPTION 'parsing_jobs table not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'extraction_results') THEN
    RAISE EXCEPTION 'extraction_results table not created';
  END IF;
END $$;
