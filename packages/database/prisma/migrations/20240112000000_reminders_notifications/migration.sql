-- ─── Migration: Reminders & Notifications Domain ──────────────────────────────
-- Creates:
--   reminder_type, reminder_status, reminder_priority,
--   reminder_activity_action, notification_channel, notification_status  (enums)
--   reminders, reminder_activities, notifications                         (tables)

-- ── Enum types ────────────────────────────────────────────────────────────────

CREATE TYPE "reminder_type" AS ENUM (
  'UPCOMING_INTERVIEW',
  'INTERVIEW_FEEDBACK_PENDING',
  'OVERDUE_SUBMISSION_FOLLOWUP',
  'CANDIDATE_AVAILABILITY_FOLLOWUP',
  'RECRUITER_ACTION_REQUIRED',
  'STALLED_WORKFLOW',
  'OVERDUE_INTERVIEW_SCHEDULING',
  'PENDING_RECRUITER_REVIEW',
  'INTERVIEW_CONFIRMATION_NEEDED',
  'CUSTOM'
);

CREATE TYPE "reminder_status" AS ENUM (
  'PENDING',
  'ACKNOWLEDGED',
  'SNOOZED',
  'COMPLETED',
  'DISMISSED',
  'EXPIRED'
);

CREATE TYPE "reminder_priority" AS ENUM (
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW'
);

CREATE TYPE "reminder_activity_action" AS ENUM (
  'CREATED',
  'VIEWED',
  'ACKNOWLEDGED',
  'SNOOZED',
  'COMPLETED',
  'DISMISSED',
  'ESCALATED',
  'REOPENED',
  'UPDATED'
);

CREATE TYPE "notification_channel" AS ENUM (
  'IN_APP',
  'EMAIL',
  'SMS'
);

CREATE TYPE "notification_status" AS ENUM (
  'PENDING',
  'DELIVERED',
  'READ',
  'FAILED'
);

-- ── reminders ─────────────────────────────────────────────────────────────────

CREATE TABLE "reminders" (
  "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"   UUID         NOT NULL,
  "type"              "reminder_type"     NOT NULL,
  "priority"          "reminder_priority" NOT NULL DEFAULT 'MEDIUM',
  "status"            "reminder_status"   NOT NULL DEFAULT 'PENDING',
  "title"             VARCHAR(500) NOT NULL,
  "description"       TEXT,
  "due_at"            TIMESTAMPTZ,
  "snoozed_until"     TIMESTAMPTZ,
  "acknowledged_at"   TIMESTAMPTZ,
  "completed_at"      TIMESTAMPTZ,
  "dismissed_at"      TIMESTAMPTZ,
  "is_auto_generated" BOOLEAN      NOT NULL DEFAULT false,
  "submission_id"     UUID,
  "interview_id"      UUID,
  "candidate_id"      UUID,
  "job_id"            UUID,
  "assignee_id"       UUID         NOT NULL,
  "created_by_id"     UUID         NOT NULL,
  "metadata"          JSONB        NOT NULL DEFAULT '{}',
  "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "deleted_at"        TIMESTAMPTZ,

  CONSTRAINT "reminders_pkey"                PRIMARY KEY ("id"),
  CONSTRAINT "reminders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "reminders_assignee_id_fkey"     FOREIGN KEY ("assignee_id")     REFERENCES "users"("id")         ON DELETE RESTRICT,
  CONSTRAINT "reminders_created_by_id_fkey"   FOREIGN KEY ("created_by_id")   REFERENCES "users"("id")         ON DELETE RESTRICT,
  CONSTRAINT "reminders_submission_id_fkey"   FOREIGN KEY ("submission_id")   REFERENCES "submissions"("id")   ON DELETE SET NULL,
  CONSTRAINT "reminders_interview_id_fkey"    FOREIGN KEY ("interview_id")    REFERENCES "interviews"("id")    ON DELETE SET NULL,
  CONSTRAINT "reminders_candidate_id_fkey"    FOREIGN KEY ("candidate_id")    REFERENCES "candidates"("id")    ON DELETE SET NULL,
  CONSTRAINT "reminders_job_id_fkey"          FOREIGN KEY ("job_id")          REFERENCES "job_descriptions"("id") ON DELETE SET NULL
);

-- ── reminder_activities ───────────────────────────────────────────────────────

CREATE TABLE "reminder_activities" (
  "id"               UUID                         NOT NULL DEFAULT gen_random_uuid(),
  "reminder_id"      UUID                         NOT NULL,
  "organization_id"  UUID                         NOT NULL,
  "actor_id"         UUID                         NOT NULL,
  "action"           "reminder_activity_action"   NOT NULL,
  "note"             VARCHAR(1000),
  "metadata"         JSONB                        NOT NULL DEFAULT '{}',
  "created_at"       TIMESTAMPTZ                  NOT NULL DEFAULT NOW(),

  CONSTRAINT "reminder_activities_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "reminder_activities_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "reminders"("id")  ON DELETE CASCADE,
  CONSTRAINT "reminder_activities_actor_id_fkey"   FOREIGN KEY ("actor_id")    REFERENCES "users"("id")      ON DELETE RESTRICT
);

-- ── notifications ─────────────────────────────────────────────────────────────

CREATE TABLE "notifications" (
  "id"               UUID                     NOT NULL DEFAULT gen_random_uuid(),
  "organization_id"  UUID                     NOT NULL,
  "recipient_id"     UUID                     NOT NULL,
  "reminder_id"      UUID,
  "channel"          "notification_channel"   NOT NULL DEFAULT 'IN_APP',
  "status"           "notification_status"    NOT NULL DEFAULT 'PENDING',
  "title"            VARCHAR(500)             NOT NULL,
  "body"             TEXT,
  "action_url"       VARCHAR(1000),
  "is_read"          BOOLEAN                  NOT NULL DEFAULT false,
  "read_at"          TIMESTAMPTZ,
  "delivered_at"     TIMESTAMPTZ,
  "metadata"         JSONB                    NOT NULL DEFAULT '{}',
  "created_at"       TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ              NOT NULL DEFAULT NOW(),

  CONSTRAINT "notifications_pkey"                  PRIMARY KEY ("id"),
  CONSTRAINT "notifications_organization_id_fkey"  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "notifications_recipient_id_fkey"     FOREIGN KEY ("recipient_id")    REFERENCES "users"("id")         ON DELETE CASCADE,
  CONSTRAINT "notifications_reminder_id_fkey"      FOREIGN KEY ("reminder_id")     REFERENCES "reminders"("id")     ON DELETE SET NULL
);

-- ── Indexes: reminders ────────────────────────────────────────────────────────

-- Primary action-center query: all pending/active by org, ordered by due date
CREATE INDEX "reminders_org_status_due_idx"       ON "reminders" ("organization_id", "status", "due_at");
-- Personal recruiter queue
CREATE INDEX "reminders_org_assignee_status_idx"  ON "reminders" ("organization_id", "assignee_id", "status");
-- Type-based filtering
CREATE INDEX "reminders_org_type_status_idx"      ON "reminders" ("organization_id", "type", "status");
-- Workflow navigation
CREATE INDEX "reminders_interview_id_idx"         ON "reminders" ("interview_id");
CREATE INDEX "reminders_submission_id_idx"        ON "reminders" ("submission_id");
CREATE INDEX "reminders_candidate_id_idx"         ON "reminders" ("candidate_id");
-- Due-date queries (batch priority escalation, snooze restore)
CREATE INDEX "reminders_due_at_idx"               ON "reminders" ("due_at");
CREATE INDEX "reminders_snoozed_until_idx"        ON "reminders" ("snoozed_until") WHERE "status" = 'SNOOZED';
CREATE INDEX "reminders_deleted_at_idx"           ON "reminders" ("deleted_at");

-- ── Indexes: reminder_activities ──────────────────────────────────────────────

CREATE INDEX "reminder_activities_reminder_id_idx"  ON "reminder_activities" ("reminder_id");
CREATE INDEX "reminder_activities_org_actor_idx"    ON "reminder_activities" ("organization_id", "actor_id");

-- ── Indexes: notifications ────────────────────────────────────────────────────

-- Bell badge: count unread for recipient
CREATE INDEX "notifications_org_recipient_unread_idx"   ON "notifications" ("organization_id", "recipient_id", "is_read");
-- Inbox list: most recent first
CREATE INDEX "notifications_org_recipient_created_idx"  ON "notifications" ("organization_id", "recipient_id", "created_at");
CREATE INDEX "notifications_reminder_id_idx"            ON "notifications" ("reminder_id");
