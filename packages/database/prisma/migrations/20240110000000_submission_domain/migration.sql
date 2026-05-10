-- ─── Migration: Submission Domain ────────────────────────────────────────────
-- Creates the three submission tables and all supporting indexes.
-- Dependency order: enum → submissions → submission_notes → submission_status_history

-- ── 1. SubmissionStatus enum ──────────────────────────────────────────────────

CREATE TYPE "submission_status" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'PLACED',
  'REJECTED',
  'WITHDRAWN',
  'ON_HOLD',
  'CLOSED'
);

-- ── 2. submissions ────────────────────────────────────────────────────────────

CREATE TABLE "submissions" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  UUID        NOT NULL,
  "candidate_id"     UUID        NOT NULL,
  "job_id"           UUID        NOT NULL,
  "vendor_id"        UUID,
  "owner_id"         UUID        NOT NULL,
  "created_by_id"    UUID        NOT NULL,
  "status"           "submission_status" NOT NULL DEFAULT 'DRAFT',

  -- Stage timestamps
  "submitted_at"     TIMESTAMPTZ,
  "reviewed_at"      TIMESTAMPTZ,
  "shortlisted_at"   TIMESTAMPTZ,
  "interview_at"     TIMESTAMPTZ,
  "offered_at"       TIMESTAMPTZ,
  "placed_at"        TIMESTAMPTZ,
  "rejected_at"      TIMESTAMPTZ,
  "withdrawn_at"     TIMESTAMPTZ,
  "closed_at"        TIMESTAMPTZ,

  -- Rate / offer
  "bill_rate"        DECIMAL(10,2),
  "pay_rate"         DECIMAL(10,2),
  "currency"         VARCHAR(3)   NOT NULL DEFAULT 'USD',
  "offer_salary"     DECIMAL(12,2),
  "start_date"       DATE,

  -- Notes
  "cover_note"       TEXT,
  "rejection_reason" TEXT,

  -- Audit
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"       TIMESTAMPTZ,

  CONSTRAINT "submissions_pkey" PRIMARY KEY ("id"),

  -- FK constraints
  CONSTRAINT "submissions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "submissions_candidate_id_fkey"
    FOREIGN KEY ("candidate_id")    REFERENCES "candidates"("id")    ON DELETE RESTRICT,
  CONSTRAINT "submissions_job_id_fkey"
    FOREIGN KEY ("job_id")          REFERENCES "job_descriptions"("id") ON DELETE RESTRICT,
  CONSTRAINT "submissions_vendor_id_fkey"
    FOREIGN KEY ("vendor_id")       REFERENCES "vendors"("id")       ON DELETE SET NULL,
  CONSTRAINT "submissions_owner_id_fkey"
    FOREIGN KEY ("owner_id")        REFERENCES "users"("id")         ON DELETE RESTRICT,
  CONSTRAINT "submissions_created_by_id_fkey"
    FOREIGN KEY ("created_by_id")   REFERENCES "users"("id")         ON DELETE RESTRICT
);

-- Standard indexes
CREATE INDEX "submissions_organization_id_idx"         ON "submissions" ("organization_id");
CREATE INDEX "submissions_org_status_idx"              ON "submissions" ("organization_id", "status");
CREATE INDEX "submissions_org_candidate_idx"           ON "submissions" ("organization_id", "candidate_id");
CREATE INDEX "submissions_org_job_idx"                 ON "submissions" ("organization_id", "job_id");
CREATE INDEX "submissions_org_owner_idx"               ON "submissions" ("organization_id", "owner_id");
CREATE INDEX "submissions_org_vendor_idx"              ON "submissions" ("organization_id", "vendor_id");
CREATE INDEX "submissions_org_created_at_idx"          ON "submissions" ("organization_id", "created_at");
CREATE INDEX "submissions_org_deleted_at_idx"          ON "submissions" ("organization_id", "deleted_at");
CREATE INDEX "submissions_org_job_status_idx"          ON "submissions" ("organization_id", "job_id", "status");
CREATE INDEX "submissions_org_candidate_status_idx"    ON "submissions" ("organization_id", "candidate_id", "status");

-- Partial unique index for duplicate prevention:
-- At most one non-terminal active submission per (org, candidate, job) combo.
-- Terminal statuses (REJECTED, WITHDRAWN, PLACED, CLOSED) allow re-submission.
CREATE UNIQUE INDEX "submissions_active_unique"
  ON "submissions" ("organization_id", "candidate_id", "job_id")
  WHERE "status" NOT IN ('REJECTED', 'WITHDRAWN', 'PLACED', 'CLOSED')
    AND "deleted_at" IS NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER "submissions_updated_at"
  BEFORE UPDATE ON "submissions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. submission_notes ───────────────────────────────────────────────────────

CREATE TABLE "submission_notes" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "submission_id"  UUID        NOT NULL,
  "organization_id" UUID       NOT NULL,
  "content"        TEXT        NOT NULL,
  "note_type"      "note_type" NOT NULL DEFAULT 'NOTE',
  "is_system"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "author_id"      UUID,
  "author_email"   VARCHAR(255),
  "author_name"    VARCHAR(255),
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "submission_notes_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "submission_notes_submission_id_fkey"
    FOREIGN KEY ("submission_id")   REFERENCES "submissions"("id")    ON DELETE CASCADE,
  CONSTRAINT "submission_notes_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")  ON DELETE CASCADE,
  CONSTRAINT "submission_notes_author_id_fkey"
    FOREIGN KEY ("author_id")       REFERENCES "users"("id")          ON DELETE SET NULL
);

CREATE INDEX "submission_notes_submission_id_idx"         ON "submission_notes" ("submission_id");
CREATE INDEX "submission_notes_organization_id_idx"       ON "submission_notes" ("organization_id");
CREATE INDEX "submission_notes_submission_id_created_idx" ON "submission_notes" ("submission_id", "created_at");

-- ── 4. submission_status_history ──────────────────────────────────────────────

CREATE TABLE "submission_status_history" (
  "id"             UUID               NOT NULL DEFAULT gen_random_uuid(),
  "submission_id"  UUID               NOT NULL,
  "from_status"    "submission_status",
  "to_status"      "submission_status" NOT NULL,
  "changed_by_id"  UUID               NOT NULL,
  "reason"         TEXT,
  "created_at"     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT "submission_status_history_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "submission_status_history_submission_id_fkey"
    FOREIGN KEY ("submission_id")  REFERENCES "submissions"("id") ON DELETE CASCADE,
  CONSTRAINT "submission_status_history_changed_by_id_fkey"
    FOREIGN KEY ("changed_by_id") REFERENCES "users"("id")        ON DELETE RESTRICT
);

CREATE INDEX "submission_status_history_submission_id_idx"      ON "submission_status_history" ("submission_id");
CREATE INDEX "submission_status_history_submission_created_idx" ON "submission_status_history" ("submission_id", "created_at");
