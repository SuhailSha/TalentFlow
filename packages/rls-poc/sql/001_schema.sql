-- ── PoC schema ─────────────────────────────────────────────────────────────
-- Minimal two-table model: an organization and a candidate scoped to it.
-- Production tables remain untouched; we use a dedicated schema so this
-- PoC can be torn down without affecting anything else.

CREATE SCHEMA IF NOT EXISTS rls_poc;

DROP TABLE IF EXISTS rls_poc.candidates CASCADE;
DROP TABLE IF EXISTS rls_poc.organizations CASCADE;

CREATE TABLE rls_poc.organizations (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

CREATE TABLE rls_poc.candidates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES rls_poc.organizations(id),
  email           text NOT NULL,
  name            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index matches the RLS predicate. The query planner reuses this index
-- to satisfy both the user filter and the RLS check.
CREATE INDEX candidates_org_id_idx ON rls_poc.candidates (organization_id);
