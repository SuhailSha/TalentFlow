-- ─── Migration: Resume Intelligence (Phase C — R1) ────────────────────────────
--
-- Five new tables. Storage half only — parsing/review/merge are R2-R5.
-- Idempotent: every CREATE uses IF NOT EXISTS where supported, every enum
-- check guards against re-creation.

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE resume_source AS ENUM (
    'RECRUITER_UPLOAD', 'VENDOR_SUBMISSION', 'API_IMPORT', 'EMAIL_INTAKE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resume_status AS ENUM (
    'DRAFT', 'PROCESSING', 'NEEDS_REVIEW', 'ACTIVE', 'ARCHIVED', 'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resume_intake_batch_status AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resume_access_action AS ENUM (
    'DOWNLOAD', 'PREVIEW', 'API_FETCH', 'PARSE_READ', 'RETENTION_PURGE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resume_parser_provider AS ENUM (
    'RULE_BASED', 'GEMINI_FLASH', 'CLAUDE', 'OPENAI_GPT', 'AFFINDA', 'RCHILLI'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── ResumeIntakeBatch ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "resume_intake_batches" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL,
  label             VARCHAR(255) NOT NULL,
  source_vendor_id  UUID,
  status            resume_intake_batch_status NOT NULL DEFAULT 'OPEN',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  created_by        UUID
);

CREATE INDEX IF NOT EXISTS "resume_intake_batches_organization_id_status_idx"
  ON "resume_intake_batches" (organization_id, status);
CREATE INDEX IF NOT EXISTS "resume_intake_batches_organization_id_created_at_idx"
  ON "resume_intake_batches" (organization_id, created_at);
CREATE INDEX IF NOT EXISTS "resume_intake_batches_organization_id_source_vendor_id_idx"
  ON "resume_intake_batches" (organization_id, source_vendor_id);

-- ─── Resume ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "resumes" (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL,
  candidate_id        UUID NOT NULL,
  intake_batch_id     UUID,
  current_version_id  UUID UNIQUE,
  source              resume_source NOT NULL DEFAULT 'RECRUITER_UPLOAD',
  label               VARCHAR(255),
  status              resume_status NOT NULL DEFAULT 'DRAFT',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  created_by          UUID,
  updated_by          UUID,
  deleted_by          UUID
);

CREATE INDEX IF NOT EXISTS "resumes_organization_id_status_idx"
  ON "resumes" (organization_id, status);
CREATE INDEX IF NOT EXISTS "resumes_organization_id_candidate_id_idx"
  ON "resumes" (organization_id, candidate_id);
CREATE INDEX IF NOT EXISTS "resumes_organization_id_intake_batch_id_idx"
  ON "resumes" (organization_id, intake_batch_id);
CREATE INDEX IF NOT EXISTS "resumes_organization_id_created_at_idx"
  ON "resumes" (organization_id, created_at);
CREATE INDEX IF NOT EXISTS "resumes_organization_id_deleted_at_idx"
  ON "resumes" (organization_id, deleted_at);

-- ─── ResumeVersion ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "resume_versions" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id         UUID NOT NULL,
  organization_id   UUID NOT NULL,
  version_number    INT  NOT NULL,
  storage_provider  VARCHAR(50)   NOT NULL,
  storage_key       VARCHAR(2048) NOT NULL,
  file_name         VARCHAR(512)  NOT NULL,
  mime_type         VARCHAR(255)  NOT NULL,
  size_bytes        BIGINT        NOT NULL,
  sha256            CHAR(64)      NOT NULL,
  page_count        INT,
  uploaded_by       UUID NOT NULL,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS "resume_versions_resume_id_version_number_key"
  ON "resume_versions" (resume_id, version_number);
CREATE INDEX IF NOT EXISTS "resume_versions_organization_id_sha256_idx"
  ON "resume_versions" (organization_id, sha256);
CREATE INDEX IF NOT EXISTS "resume_versions_organization_id_uploaded_at_idx"
  ON "resume_versions" (organization_id, uploaded_at);
CREATE INDEX IF NOT EXISTS "resume_versions_organization_id_resume_id_idx"
  ON "resume_versions" (organization_id, resume_id);

-- ─── ResumeAccessLog ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "resume_access_logs" (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL,
  resume_version_id  UUID NOT NULL,
  actor_id           UUID,
  action             resume_access_action NOT NULL,
  ip_address         VARCHAR(64),
  user_agent         VARCHAR(512),
  request_id         VARCHAR(64),
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "resume_access_logs_org_version_created_idx"
  ON "resume_access_logs" (organization_id, resume_version_id, created_at);
CREATE INDEX IF NOT EXISTS "resume_access_logs_org_actor_created_idx"
  ON "resume_access_logs" (organization_id, actor_id, created_at);

-- ─── OrganizationExtractionConfig ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "organization_extraction_configs" (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID NOT NULL UNIQUE,
  preferred_provider          resume_parser_provider NOT NULL DEFAULT 'GEMINI_FLASH',
  fallback_provider           resume_parser_provider,
  extract_fields              JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_fields               JSONB NOT NULL DEFAULT '[]'::jsonb,
  extraction_rules            JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_sla_hours            INT NOT NULL DEFAULT 24,
  claim_ttl_minutes           INT NOT NULL DEFAULT 30,
  max_file_bytes              BIGINT NOT NULL DEFAULT 10485760,
  monthly_parse_budget_usd    DECIMAL(10, 2),
  monthly_parse_budget_count  INT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                  UUID
);

-- ─── Foreign keys (added after all tables exist) ──────────────────────────────

DO $$ BEGIN
  ALTER TABLE "resumes"
    ADD CONSTRAINT "resumes_intake_batch_id_fkey"
    FOREIGN KEY (intake_batch_id) REFERENCES "resume_intake_batches"(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "resumes"
    ADD CONSTRAINT "resumes_current_version_id_fkey"
    FOREIGN KEY (current_version_id) REFERENCES "resume_versions"(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "resume_versions"
    ADD CONSTRAINT "resume_versions_resume_id_fkey"
    FOREIGN KEY (resume_id) REFERENCES "resumes"(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "resume_access_logs"
    ADD CONSTRAINT "resume_access_logs_resume_version_id_fkey"
    FOREIGN KEY (resume_version_id) REFERENCES "resume_versions"(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Validate ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resumes') THEN
    RAISE EXCEPTION 'Migration failed: resumes table not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resume_versions') THEN
    RAISE EXCEPTION 'Migration failed: resume_versions table not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resume_access_logs') THEN
    RAISE EXCEPTION 'Migration failed: resume_access_logs table not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resume_intake_batches') THEN
    RAISE EXCEPTION 'Migration failed: resume_intake_batches table not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_extraction_configs') THEN
    RAISE EXCEPTION 'Migration failed: organization_extraction_configs table not created';
  END IF;
END $$;
