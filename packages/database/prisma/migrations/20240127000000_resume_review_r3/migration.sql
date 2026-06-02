-- ─── Migration: Resume Review Queue (Phase C — R3) ───────────────────────────
-- Adds the HIL ReviewTask table + two enums. Builds on R2 (ParsingJob,
-- ExtractionResult). One ReviewTask per ExtractionResult.

DO $$ BEGIN
  CREATE TYPE review_task_status AS ENUM (
    'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REPARSE_REQUESTED', 'SUPERSEDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "review_tasks" (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_result_id        UUID NOT NULL UNIQUE,
  organization_id             UUID NOT NULL,
  status                      review_task_status NOT NULL DEFAULT 'PENDING',
  priority                    review_priority    NOT NULL DEFAULT 'NORMAL',
  assignee_id                 UUID,
  claimed_at                  TIMESTAMPTZ,
  claim_expires_at            TIMESTAMPTZ,
  draft_decision              JSONB,
  draft_version               INT NOT NULL DEFAULT 0,
  decision                    JSONB,
  decision_notes              TEXT,
  decided_by_id               UUID,
  decided_at                  TIMESTAMPTZ,
  resulting_candidate_id      UUID,
  sla_due_at                  TIMESTAMPTZ,
  predecessor_review_task_id  UUID,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "review_tasks_org_status_sla_idx"
  ON "review_tasks" (organization_id, status, sla_due_at);
CREATE INDEX IF NOT EXISTS "review_tasks_org_assignee_status_idx"
  ON "review_tasks" (organization_id, assignee_id, status);
CREATE INDEX IF NOT EXISTS "review_tasks_org_priority_sla_idx"
  ON "review_tasks" (organization_id, priority, sla_due_at);
CREATE INDEX IF NOT EXISTS "review_tasks_org_created_idx"
  ON "review_tasks" (organization_id, created_at);
CREATE INDEX IF NOT EXISTS "review_tasks_candidate_idx"
  ON "review_tasks" (resulting_candidate_id);

DO $$ BEGIN
  ALTER TABLE "review_tasks"
    ADD CONSTRAINT "review_tasks_extraction_result_id_fkey"
    FOREIGN KEY (extraction_result_id) REFERENCES "extraction_results"(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "review_tasks"
    ADD CONSTRAINT "review_tasks_predecessor_review_task_id_fkey"
    FOREIGN KEY (predecessor_review_task_id) REFERENCES "review_tasks"(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_tasks') THEN
    RAISE EXCEPTION 'review_tasks table not created';
  END IF;
END $$;
