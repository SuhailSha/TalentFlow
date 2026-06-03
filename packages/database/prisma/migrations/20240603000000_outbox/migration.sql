-- ─── Migration: Transactional Outbox (ADR-003 Layer 1) ────────────────────
-- TF-1-5.
--
-- The outbox table holds domain events emitted by application code, written
-- inside the same Postgres transaction as the business state change.
-- A separate relay worker (TF-1-5 worker) polls this table and publishes
-- to Redis Streams (TF-1-6). The pattern guarantees:
--
--   * If the business transaction commits, the event row exists.
--   * If the business transaction rolls back, the event is gone.
--   * The worker's publish is at-least-once (consumers must be idempotent).
--
-- Schema notes:
--
--   sequence_num     BIGSERIAL — monotonic per-row. Used by the relay
--                     worker to fetch in insert order, and by consumers
--                     for in-order processing when needed.
--   organization_id  UUID — tenant scope (also RLS-bound).
--   aggregate_type   text — e.g., 'Candidate', 'Submission'.
--   aggregate_id     UUID — the entity the event refers to.
--   event_type       text — dot-separated: 'candidate.status.changed'.
--   payload          jsonb — event-specific shape; consumers must validate.
--   correlation_id   text — request id, propagated for tracing.
--   attempts         int — incremented by the relay on publish failure.
--   last_error       text — last publish error, for triage.
--   published_at     timestamptz NULL — set when successfully published to
--                     the Redis Stream. Used by retention purge to delete
--                     successfully-published rows older than 7 days.
--   created_at       timestamptz — when the event was emitted.

CREATE TABLE IF NOT EXISTS "outbox_events" (
  "id"              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "sequence_num"   BIGSERIAL    NOT NULL,
  "organization_id" UUID         NOT NULL,
  "aggregate_type" TEXT         NOT NULL,
  "aggregate_id"   UUID         NOT NULL,
  "event_type"     TEXT         NOT NULL,
  "payload"        JSONB        NOT NULL,
  "correlation_id" TEXT,
  "attempts"       INT          NOT NULL DEFAULT 0,
  "last_error"     TEXT,
  "published_at"   TIMESTAMPTZ,
  "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- The relay worker selects rows where published_at IS NULL, ordered by
-- sequence_num. This partial index makes that scan O(unpublished count)
-- regardless of how big the table grows.
CREATE INDEX IF NOT EXISTS "outbox_events_unpublished_idx"
  ON "outbox_events" ("sequence_num")
  WHERE "published_at" IS NULL;

-- For retention purge (delete published rows > 7 days old).
CREATE INDEX IF NOT EXISTS "outbox_events_published_at_idx"
  ON "outbox_events" ("published_at")
  WHERE "published_at" IS NOT NULL;

-- For per-tenant queries (audit, debugging).
CREATE INDEX IF NOT EXISTS "outbox_events_org_created_idx"
  ON "outbox_events" ("organization_id", "created_at" DESC);

-- ── Apply RLS (consistent with TF-1-2) ─────────────────────────────────────
-- Outbox events are tenant-scoped. The relay worker uses BYPASSRLS via the
-- app_audit_archiver-style role pattern, but normal application code that
-- emits events does so as app_tenant and therefore can only emit events
-- scoped to its own tenant. WITH CHECK enforces this.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "outbox_events" TO app_tenant;
ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outbox_events_tenant_isolation ON "outbox_events";
CREATE POLICY outbox_events_tenant_isolation ON "outbox_events"
  FOR ALL
  TO app_tenant
  USING      ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
  WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

-- ── Validation ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'outbox_events'
  ) THEN
    RAISE EXCEPTION 'TF-1-5 migration failed: outbox_events table not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'outbox_events'
       AND policyname = 'outbox_events_tenant_isolation'
  ) THEN
    RAISE EXCEPTION 'TF-1-5 migration failed: tenant isolation policy missing';
  END IF;
END $$;

COMMENT ON TABLE "outbox_events" IS
  'Transactional outbox per ADR-003 Layer 1. Rows are emitted inside business '
  'transactions and published by the outbox relay worker. Consumers receive '
  'at-least-once delivery and must be idempotent.';
