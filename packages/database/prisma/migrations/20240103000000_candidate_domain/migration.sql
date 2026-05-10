-- ─── Migration: Candidate Domain ─────────────────────────────────────────────
-- Adds the candidate, skill, candidate_skill, and candidate_note tables.
-- Also adds new enums for candidate status, availability, source, skill
-- category, proficiency level, and note type.

-- ── Enum types ────────────────────────────────────────────────────────────────

CREATE TYPE "candidate_status" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'PLACED',
    'BLACKLISTED',
    'DO_NOT_CONTACT'
);

CREATE TYPE "availability_status" AS ENUM (
    'IMMEDIATELY',
    'TWO_WEEKS',
    'ONE_MONTH',
    'THREE_MONTHS',
    'NOT_LOOKING'
);

CREATE TYPE "candidate_source" AS ENUM (
    'MANUAL',
    'IMPORT',
    'VENDOR',
    'JOB_BOARD',
    'REFERRAL'
);

CREATE TYPE "skill_category" AS ENUM (
    'PROGRAMMING_LANGUAGE',
    'FRAMEWORK_LIBRARY',
    'DATABASE',
    'CLOUD_INFRASTRUCTURE',
    'DEVOPS',
    'DESIGN',
    'PROJECT_MANAGEMENT',
    'SOFT_SKILL',
    'DOMAIN_EXPERTISE',
    'OTHER'
);

CREATE TYPE "proficiency_level" AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'EXPERT'
);

CREATE TYPE "note_type" AS ENUM (
    'NOTE',
    'CALL',
    'EMAIL',
    'MEETING',
    'STATUS_CHANGE',
    'SYSTEM'
);

-- ── Table: skills ─────────────────────────────────────────────────────────────
-- Global catalogue — no organization_id. Skills are shared across all tenants.

CREATE TABLE "skills" (
    "id"                     UUID          NOT NULL,
    "name"                   VARCHAR(100)  NOT NULL,
    "display_name"           VARCHAR(100)  NOT NULL,
    "category"               "skill_category" NOT NULL DEFAULT 'OTHER',
    "aliases"                TEXT[]        NOT NULL DEFAULT ARRAY[]::TEXT[],
    "source_organization_id" UUID,
    "created_at"             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"             TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- ── Table: candidates ─────────────────────────────────────────────────────────

CREATE TABLE "candidates" (
    "id"                      UUID             NOT NULL,
    "organization_id"         UUID             NOT NULL,
    "email"                   VARCHAR(255)     NOT NULL,
    "first_name"              VARCHAR(100)     NOT NULL,
    "last_name"               VARCHAR(100)     NOT NULL,
    "phone"                   VARCHAR(50),
    "linkedin_url"            TEXT,
    "github_url"              TEXT,
    "portfolio_url"           TEXT,
    "city"                    VARCHAR(100),
    "state_province"          VARCHAR(100),
    "country"                 VARCHAR(100),
    "timezone"                VARCHAR(50),
    "is_remote"               BOOLEAN          NOT NULL DEFAULT FALSE,
    "current_title"           VARCHAR(255),
    "current_company"         VARCHAR(255),
    "career_start_date"       DATE,
    "summary"                 TEXT,
    "salary_expectation_min"  INTEGER,
    "salary_expectation_max"  INTEGER,
    "salary_currency"         VARCHAR(3),
    "status"                  "candidate_status"    NOT NULL DEFAULT 'ACTIVE',
    "availability_status"     "availability_status" NOT NULL DEFAULT 'NOT_LOOKING',
    "available_from"          DATE,
    "source"                  "candidate_source"    NOT NULL DEFAULT 'MANUAL',
    "source_detail"           VARCHAR(255),
    "resume_file_key"         VARCHAR(512),
    "resume_file_name"        VARCHAR(255),
    "resume_uploaded_at"      TIMESTAMP(3),
    "last_activity_at"        TIMESTAMP(3),
    "created_at"              TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"              TIMESTAMP(3)     NOT NULL,
    "deleted_at"              TIMESTAMP(3),
    "created_by"              UUID,
    "updated_by"              UUID,
    "deleted_by"              UUID,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidates_org_email_key"       ON "candidates"("organization_id", "email");
CREATE INDEX "candidates_org_idx"                    ON "candidates"("organization_id");
CREATE INDEX "candidates_org_status_idx"             ON "candidates"("organization_id", "status");
CREATE INDEX "candidates_org_availability_idx"       ON "candidates"("organization_id", "availability_status");
CREATE INDEX "candidates_org_deleted_idx"            ON "candidates"("organization_id", "deleted_at");
CREATE INDEX "candidates_org_created_idx"            ON "candidates"("organization_id", "created_at");
CREATE INDEX "candidates_org_last_activity_idx"      ON "candidates"("organization_id", "last_activity_at");
CREATE INDEX "candidates_org_career_start_idx"       ON "candidates"("organization_id", "career_start_date");
CREATE INDEX "candidates_org_country_idx"            ON "candidates"("organization_id", "country");

ALTER TABLE "candidates" ADD CONSTRAINT "candidates_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Table: candidate_skills ───────────────────────────────────────────────────

CREATE TABLE "candidate_skills" (
    "id"                  UUID              NOT NULL,
    "candidate_id"        UUID              NOT NULL,
    "skill_id"            UUID              NOT NULL,
    "proficiency_level"   "proficiency_level" NOT NULL DEFAULT 'INTERMEDIATE',
    "years_of_experience" INTEGER,
    "is_primary"          BOOLEAN           NOT NULL DEFAULT FALSE,
    "assigned_by"         UUID,
    "assigned_at"         TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidate_skills_candidate_skill_key" ON "candidate_skills"("candidate_id", "skill_id");
CREATE INDEX "candidate_skills_candidate_idx"              ON "candidate_skills"("candidate_id");
CREATE INDEX "candidate_skills_skill_idx"                  ON "candidate_skills"("skill_id");
CREATE INDEX "candidate_skills_skill_level_idx"            ON "candidate_skills"("skill_id", "proficiency_level");

ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_id_fkey"
    FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skill_id_fkey"
    FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Table: candidate_notes ────────────────────────────────────────────────────

CREATE TABLE "candidate_notes" (
    "id"              UUID         NOT NULL,
    "candidate_id"    UUID         NOT NULL,
    "organization_id" UUID         NOT NULL,
    "content"         TEXT         NOT NULL,
    "note_type"       "note_type"  NOT NULL DEFAULT 'NOTE',
    "author_id"       UUID,
    "author_email"    VARCHAR(255),
    "author_name"     VARCHAR(255),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "candidate_notes_candidate_idx"            ON "candidate_notes"("candidate_id");
CREATE INDEX "candidate_notes_org_idx"                  ON "candidate_notes"("organization_id");
CREATE INDEX "candidate_notes_candidate_created_idx"    ON "candidate_notes"("candidate_id", "created_at");

ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_candidate_id_fkey"
    FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
