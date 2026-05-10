-- ─── Migration: Job Description Domain ────────────────────────────────────────
-- Adds the job_descriptions, job_skills, and job_notes tables.
-- Adds new enums: job_status, job_priority, employment_type, work_mode,
-- salary_type, importance_level.

-- ── Enum types ────────────────────────────────────────────────────────────────

CREATE TYPE "job_status" AS ENUM (
    'DRAFT',
    'OPEN',
    'ON_HOLD',
    'FILLED',
    'CANCELLED',
    'ARCHIVED'
);

CREATE TYPE "job_priority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);

CREATE TYPE "employment_type" AS ENUM (
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'CONTRACT_TO_HIRE',
    'FREELANCE',
    'INTERNSHIP'
);

CREATE TYPE "work_mode" AS ENUM (
    'ONSITE',
    'REMOTE',
    'HYBRID'
);

CREATE TYPE "salary_type" AS ENUM (
    'ANNUAL',
    'HOURLY',
    'MONTHLY',
    'TOTAL_COMPENSATION'
);

CREATE TYPE "importance_level" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);

-- ── Table: job_descriptions ───────────────────────────────────────────────────
-- Core recruiting entity. One row = one open position (or group of seats for
-- bulk roles). Requisition ID (req_id) is human-readable and org-scoped.

CREATE TABLE "job_descriptions" (
    "id"                   UUID              NOT NULL,
    "organization_id"      UUID              NOT NULL,
    "req_id"               VARCHAR(20)       NOT NULL,
    "title"                VARCHAR(255)      NOT NULL,
    "department"           VARCHAR(100),
    "employment_type"      "employment_type" NOT NULL DEFAULT 'FULL_TIME',
    "work_mode"            "work_mode"       NOT NULL DEFAULT 'ONSITE',
    "status"               "job_status"      NOT NULL DEFAULT 'DRAFT',
    "hiring_priority"      "job_priority"    NOT NULL DEFAULT 'NORMAL',
    "hiring_manager_id"    UUID,
    "hiring_manager_name"  VARCHAR(255),
    "open_positions"       INTEGER           NOT NULL DEFAULT 1,
    "filled_positions"     INTEGER           NOT NULL DEFAULT 0,
    "experience_min"       INTEGER,
    "experience_max"       INTEGER,
    "salary_min"           INTEGER,
    "salary_max"           INTEGER,
    "salary_currency"      VARCHAR(3),
    "salary_type"          "salary_type"     NOT NULL DEFAULT 'ANNUAL',
    "city"                 VARCHAR(100),
    "state_province"       VARCHAR(100),
    "country"              VARCHAR(100),
    "timezone"             VARCHAR(50),
    "description"          TEXT,
    "requirements"         TEXT,
    "nice_to_have"         TEXT,
    "benefits"             TEXT,
    "target_hire_date"     DATE,
    "opened_at"            TIMESTAMP(3),
    "closed_at"            TIMESTAMP(3),
    "created_at"           TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3)      NOT NULL,
    "deleted_at"           TIMESTAMP(3),
    "created_by"           UUID,
    "updated_by"           UUID,
    "deleted_by"           UUID,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- Unique req_id per org
CREATE UNIQUE INDEX "job_descriptions_org_req_id_key"
    ON "job_descriptions"("organization_id", "req_id");

-- Core tenant isolation and filter indexes
CREATE INDEX "job_descriptions_org_idx"
    ON "job_descriptions"("organization_id");
CREATE INDEX "job_descriptions_org_status_idx"
    ON "job_descriptions"("organization_id", "status");
CREATE INDEX "job_descriptions_org_status_priority_idx"
    ON "job_descriptions"("organization_id", "status", "hiring_priority");
CREATE INDEX "job_descriptions_org_department_idx"
    ON "job_descriptions"("organization_id", "department");
CREATE INDEX "job_descriptions_org_work_mode_idx"
    ON "job_descriptions"("organization_id", "work_mode");
CREATE INDEX "job_descriptions_org_employment_type_idx"
    ON "job_descriptions"("organization_id", "employment_type");
CREATE INDEX "job_descriptions_org_target_hire_date_idx"
    ON "job_descriptions"("organization_id", "target_hire_date");
CREATE INDEX "job_descriptions_org_created_idx"
    ON "job_descriptions"("organization_id", "created_at");
CREATE INDEX "job_descriptions_org_deleted_idx"
    ON "job_descriptions"("organization_id", "deleted_at");
CREATE INDEX "job_descriptions_org_hiring_manager_idx"
    ON "job_descriptions"("organization_id", "hiring_manager_id");

-- Foreign keys
ALTER TABLE "job_descriptions"
    ADD CONSTRAINT "job_descriptions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "job_descriptions"
    ADD CONSTRAINT "job_descriptions_hiring_manager_id_fkey"
    FOREIGN KEY ("hiring_manager_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Table: job_skills ─────────────────────────────────────────────────────────
-- Links a JobDescription to a required/preferred Skill with importance metadata.
-- The matching engine joins CandidateSkill.skill_id ↔ JobSkill.skill_id.

CREATE TABLE "job_skills" (
    "id"                UUID               NOT NULL,
    "job_description_id" UUID              NOT NULL,
    "skill_id"          UUID               NOT NULL,
    "is_required"       BOOLEAN            NOT NULL DEFAULT TRUE,
    "importance_level"  "importance_level" NOT NULL DEFAULT 'MEDIUM',
    "minimum_years"     INTEGER,
    "added_by"          UUID,
    "added_at"          TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("id")
);

-- A skill can only be listed once per JD
CREATE UNIQUE INDEX "job_skills_jd_skill_key"
    ON "job_skills"("job_description_id", "skill_id");

CREATE INDEX "job_skills_jd_idx"
    ON "job_skills"("job_description_id");
CREATE INDEX "job_skills_skill_idx"
    ON "job_skills"("skill_id");
-- Matching engine: "all JDs that REQUIRE React"
CREATE INDEX "job_skills_skill_required_idx"
    ON "job_skills"("skill_id", "is_required");
-- UI: "required skills vs nice-to-haves for a JD"
CREATE INDEX "job_skills_jd_required_idx"
    ON "job_skills"("job_description_id", "is_required");

ALTER TABLE "job_skills"
    ADD CONSTRAINT "job_skills_job_description_id_fkey"
    FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_skills"
    ADD CONSTRAINT "job_skills_skill_id_fkey"
    FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Table: job_notes ──────────────────────────────────────────────────────────
-- Append-only activity log per job description. Mirrors candidate_notes exactly.
-- No updatedAt — notes are immutable. No soft delete — deleting corrupts trail.

CREATE TABLE "job_notes" (
    "id"                UUID         NOT NULL,
    "job_description_id" UUID        NOT NULL,
    "organization_id"   UUID         NOT NULL,
    "content"           TEXT         NOT NULL,
    "note_type"         "note_type"  NOT NULL DEFAULT 'NOTE',
    "author_id"         UUID,
    "author_email"      VARCHAR(255),
    "author_name"       VARCHAR(255),
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_notes_jd_idx"
    ON "job_notes"("job_description_id");
CREATE INDEX "job_notes_org_idx"
    ON "job_notes"("organization_id");
CREATE INDEX "job_notes_jd_created_idx"
    ON "job_notes"("job_description_id", "created_at");

ALTER TABLE "job_notes"
    ADD CONSTRAINT "job_notes_job_description_id_fkey"
    FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_notes"
    ADD CONSTRAINT "job_notes_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_notes"
    ADD CONSTRAINT "job_notes_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
