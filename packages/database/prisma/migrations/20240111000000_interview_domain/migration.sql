-- ─── Migration: Interview Domain ──────────────────────────────────────────────
-- Creates interview enums and all interview tables.
-- Dependency order: enums → interviews → feedback/notes/history/participants

-- ── 1. Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "interview_type" AS ENUM (
  'PHONE',
  'VIDEO',
  'ONSITE',
  'PANEL',
  'TECHNICAL',
  'BEHAVIORAL',
  'CASE_STUDY',
  'OTHER'
);

CREATE TYPE "interview_status" AS ENUM (
  'SCHEDULED',
  'CONFIRMED',
  'RESCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'FEEDBACK_PENDING',
  'PASSED',
  'FAILED',
  'NO_SHOW',
  'CANCELLED'
);

CREATE TYPE "feedback_recommendation" AS ENUM (
  'STRONG_YES',
  'YES',
  'NEUTRAL',
  'NO',
  'STRONG_NO'
);

CREATE TYPE "interview_participant_role" AS ENUM (
  'INTERVIEWER',
  'OBSERVER',
  'COORDINATOR'
);

-- ── 2. interviews ──────────────────────────────────────────────────────────────

CREATE TABLE "interviews" (
  "id"                  UUID            NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"     UUID            NOT NULL,
  "submission_id"       UUID            NOT NULL,
  "candidate_id"        UUID            NOT NULL,
  "job_id"              UUID            NOT NULL,

  -- Round
  "round"               INTEGER         NOT NULL DEFAULT 1,
  "round_label"         VARCHAR(100),
  "type"                "interview_type" NOT NULL DEFAULT 'PHONE',

  -- Status
  "status"              "interview_status" NOT NULL DEFAULT 'SCHEDULED',

  -- Ownership
  "owner_id"            UUID            NOT NULL,
  "created_by_id"       UUID            NOT NULL,

  -- Interviewer (denormalized for external interviewers)
  "interviewer_id"      UUID,
  "interviewer_name"    VARCHAR(255),
  "interviewer_email"   VARCHAR(255),

  -- Scheduling
  "scheduled_at"        TIMESTAMPTZ,
  "duration_minutes"    INTEGER,
  "timezone"            VARCHAR(50),
  "location"            TEXT,

  -- Stage timestamps
  "confirmed_at"        TIMESTAMPTZ,
  "started_at"          TIMESTAMPTZ,
  "completed_at"        TIMESTAMPTZ,
  "passed_at"           TIMESTAMPTZ,
  "failed_at"           TIMESTAMPTZ,
  "cancelled_at"        TIMESTAMPTZ,
  "no_show_at"          TIMESTAMPTZ,
  "rescheduled_at"      TIMESTAMPTZ,

  -- Rescheduling
  "rescheduled_from_id" UUID,
  "cancellation_reason" TEXT,

  -- Notes
  "briefing_notes"      TEXT,

  -- Audit
  "created_at"          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "deleted_at"          TIMESTAMPTZ,

  CONSTRAINT "interviews_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "interviews_organization_id_fkey"
    FOREIGN KEY ("organization_id")     REFERENCES "organizations"("id")     ON DELETE RESTRICT,
  CONSTRAINT "interviews_submission_id_fkey"
    FOREIGN KEY ("submission_id")       REFERENCES "submissions"("id")       ON DELETE RESTRICT,
  CONSTRAINT "interviews_candidate_id_fkey"
    FOREIGN KEY ("candidate_id")        REFERENCES "candidates"("id")        ON DELETE RESTRICT,
  CONSTRAINT "interviews_job_id_fkey"
    FOREIGN KEY ("job_id")              REFERENCES "job_descriptions"("id")  ON DELETE RESTRICT,
  CONSTRAINT "interviews_owner_id_fkey"
    FOREIGN KEY ("owner_id")            REFERENCES "users"("id")             ON DELETE RESTRICT,
  CONSTRAINT "interviews_created_by_id_fkey"
    FOREIGN KEY ("created_by_id")       REFERENCES "users"("id")             ON DELETE RESTRICT,
  CONSTRAINT "interviews_interviewer_id_fkey"
    FOREIGN KEY ("interviewer_id")      REFERENCES "users"("id")             ON DELETE SET NULL,
  CONSTRAINT "interviews_rescheduled_from_id_fkey"
    FOREIGN KEY ("rescheduled_from_id") REFERENCES "interviews"("id")        ON DELETE SET NULL
);

CREATE INDEX "interviews_org_idx"                ON "interviews" ("organization_id");
CREATE INDEX "interviews_org_status_idx"         ON "interviews" ("organization_id", "status");
CREATE INDEX "interviews_org_submission_idx"     ON "interviews" ("organization_id", "submission_id");
CREATE INDEX "interviews_org_candidate_idx"      ON "interviews" ("organization_id", "candidate_id");
CREATE INDEX "interviews_org_job_idx"            ON "interviews" ("organization_id", "job_id");
CREATE INDEX "interviews_org_owner_idx"          ON "interviews" ("organization_id", "owner_id");
CREATE INDEX "interviews_org_interviewer_idx"    ON "interviews" ("organization_id", "interviewer_id");
CREATE INDEX "interviews_org_scheduled_at_idx"   ON "interviews" ("organization_id", "scheduled_at");
CREATE INDEX "interviews_org_status_sched_idx"   ON "interviews" ("organization_id", "status", "scheduled_at");
CREATE INDEX "interviews_org_deleted_at_idx"     ON "interviews" ("organization_id", "deleted_at");

-- updated_at trigger (reuse function from submissions migration if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER "interviews_updated_at"
  BEFORE UPDATE ON "interviews"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. interview_feedback ──────────────────────────────────────────────────────

CREATE TABLE "interview_feedback" (
  "id"                   UUID                      NOT NULL DEFAULT gen_random_uuid(),
  "interview_id"         UUID                      NOT NULL,
  "organization_id"      UUID                      NOT NULL,
  "submitted_by_id"      UUID,
  "submitter_name"       VARCHAR(255),
  "submitter_email"      VARCHAR(255),
  "recommendation"       "feedback_recommendation" DEFAULT 'NEUTRAL',
  "technical_score"      INTEGER CHECK ("technical_score" BETWEEN 1 AND 5),
  "communication_score"  INTEGER CHECK ("communication_score" BETWEEN 1 AND 5),
  "culture_fit_score"    INTEGER CHECK ("culture_fit_score" BETWEEN 1 AND 5),
  "overall_score"        INTEGER CHECK ("overall_score" BETWEEN 1 AND 5),
  "strengths"            TEXT,
  "concerns"             TEXT,
  "notes"                TEXT,
  "is_submitted"         BOOLEAN                   NOT NULL DEFAULT FALSE,
  "submitted_at"         TIMESTAMPTZ,
  "created_at"           TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ               NOT NULL DEFAULT NOW(),

  CONSTRAINT "interview_feedback_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "interview_feedback_interview_id_fkey"
    FOREIGN KEY ("interview_id")    REFERENCES "interviews"("id")   ON DELETE CASCADE,
  CONSTRAINT "interview_feedback_submitted_by_id_fkey"
    FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id")        ON DELETE SET NULL
);

CREATE INDEX "interview_feedback_interview_id_idx"           ON "interview_feedback" ("interview_id");
CREATE INDEX "interview_feedback_interview_submitted_idx"    ON "interview_feedback" ("interview_id", "is_submitted");
CREATE INDEX "interview_feedback_org_idx"                    ON "interview_feedback" ("organization_id");

CREATE TRIGGER "interview_feedback_updated_at"
  BEFORE UPDATE ON "interview_feedback"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 4. interview_notes ─────────────────────────────────────────────────────────

CREATE TABLE "interview_notes" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "interview_id"    UUID        NOT NULL,
  "organization_id" UUID        NOT NULL,
  "content"         TEXT        NOT NULL,
  "note_type"       "note_type" NOT NULL DEFAULT 'NOTE',
  "is_system"       BOOLEAN     NOT NULL DEFAULT FALSE,
  "author_id"       UUID,
  "author_email"    VARCHAR(255),
  "author_name"     VARCHAR(255),
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "interview_notes_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "interview_notes_interview_id_fkey"
    FOREIGN KEY ("interview_id")    REFERENCES "interviews"("id")   ON DELETE CASCADE,
  CONSTRAINT "interview_notes_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
  CONSTRAINT "interview_notes_author_id_fkey"
    FOREIGN KEY ("author_id")       REFERENCES "users"("id")        ON DELETE SET NULL
);

CREATE INDEX "interview_notes_interview_id_idx"         ON "interview_notes" ("interview_id");
CREATE INDEX "interview_notes_org_idx"                  ON "interview_notes" ("organization_id");
CREATE INDEX "interview_notes_interview_created_idx"    ON "interview_notes" ("interview_id", "created_at");

-- ── 5. interview_status_history ────────────────────────────────────────────────

CREATE TABLE "interview_status_history" (
  "id"             UUID               NOT NULL DEFAULT gen_random_uuid(),
  "interview_id"   UUID               NOT NULL,
  "from_status"    "interview_status",
  "to_status"      "interview_status" NOT NULL,
  "changed_by_id"  UUID               NOT NULL,
  "reason"         TEXT,
  "created_at"     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT "interview_status_history_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "interview_status_history_interview_id_fkey"
    FOREIGN KEY ("interview_id")  REFERENCES "interviews"("id") ON DELETE CASCADE,
  CONSTRAINT "interview_status_history_changed_by_id_fkey"
    FOREIGN KEY ("changed_by_id") REFERENCES "users"("id")      ON DELETE RESTRICT
);

CREATE INDEX "interview_status_history_interview_id_idx"     ON "interview_status_history" ("interview_id");
CREATE INDEX "interview_status_history_interview_created_idx" ON "interview_status_history" ("interview_id", "created_at");

-- ── 6. interview_participants ──────────────────────────────────────────────────

CREATE TABLE "interview_participants" (
  "id"            UUID                        NOT NULL DEFAULT gen_random_uuid(),
  "interview_id"  UUID                        NOT NULL,
  "user_id"       UUID,
  "name"          VARCHAR(255)                NOT NULL,
  "email"         VARCHAR(255)                NOT NULL,
  "role"          "interview_participant_role" NOT NULL DEFAULT 'INTERVIEWER',
  "has_confirmed" BOOLEAN                     NOT NULL DEFAULT FALSE,
  "confirmed_at"  TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),

  CONSTRAINT "interview_participants_pkey" PRIMARY KEY ("id"),

  CONSTRAINT "interview_participants_interview_id_email_key"
    UNIQUE ("interview_id", "email"),

  CONSTRAINT "interview_participants_interview_id_fkey"
    FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE,
  CONSTRAINT "interview_participants_user_id_fkey"
    FOREIGN KEY ("user_id")      REFERENCES "users"("id")      ON DELETE SET NULL
);

CREATE INDEX "interview_participants_interview_id_idx" ON "interview_participants" ("interview_id");
