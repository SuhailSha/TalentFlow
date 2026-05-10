-- ─── Migration: Candidate Full-Text Search Foundation ────────────────────────
--
-- Phase 1 search used ILIKE '%term%' — adequate to ~50k candidates/tenant.
-- This migration adds a PostgreSQL tsvector GENERATED ALWAYS AS column backed
-- by a GIN index, enabling O(1) lexeme lookup vs. O(n) sequential scan.
--
-- Design decisions:
--
--  1. GENERATED ALWAYS AS ... STORED:
--     PostgreSQL maintains the tsvector automatically on INSERT/UPDATE.
--     Zero application-layer maintenance required. The column is physically
--     stored (not computed on read), so GIN indexing works correctly.
--
--  2. Configuration: 'simple' (not 'english'):
--     'english' applies stemming (e.g. "running" → "run") which is unhelpful
--     for proper nouns (names, company names, skill names).
--     'simple' lowercases and strips punctuation without stemming — correct
--     for our dataset of names/titles/companies/emails.
--
--  3. Weighted fields (setweight):
--     A :: first_name + last_name (highest relevance)
--     B :: email                  (high — users often search by email)
--     C :: current_title          (medium — job title search)
--     D :: current_company + summary (lower — broader context)
--     ts_rank() uses these weights to sort results by relevance.
--
--  4. coalesce(field, ''):
--     NULL fields are coalesced to '' so the concatenation doesn't
--     produce NULL (which would result in an empty tsvector).
--
--  5. Prisma compatibility:
--     Prisma 5 cannot represent GENERATED columns natively.
--     This column is NOT added to schema.prisma — Prisma ignores unknown
--     columns in queries. Repository uses $queryRaw for FTS queries.
--     Running `prisma migrate dev` (not deploy) after this migration will
--     NOT attempt to drop this column — Prisma's shadow database strategy
--     replays all migrations including this one.
--
--  6. Future extensions:
--     When candidate tags, skills, and notes are added to the search scope,
--     extend the GENERATED expression or use a separate tsvector maintained
--     by application code (for cross-table content like skills).

-- Add the tsvector GENERATED column
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple',
      coalesce(first_name, '') || ' ' || coalesce(last_name, '')
    ), 'A') ||
    setweight(to_tsvector('simple',
      coalesce(email, '')
    ), 'B') ||
    setweight(to_tsvector('simple',
      coalesce(current_title, '')
    ), 'C') ||
    setweight(to_tsvector('simple',
      coalesce(current_company, '') || ' ' || coalesce(summary, '')
    ), 'D')
  ) STORED;

-- GIN index: optimised for @@ (tsvector match) queries
-- GIN is preferred over GiST for text search — larger index, faster lookup.
-- Note: CONCURRENTLY is omitted here because Prisma migrate deploy wraps
-- migrations in a transaction and CONCURRENTLY cannot run inside one.
-- For large production tables, create this index manually BEFORE running
-- the migration: CREATE INDEX CONCURRENTLY ... ON candidates USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS candidates_search_vector_gin_idx
  ON candidates USING GIN (search_vector);

-- Composite index: (organizationId, search_vector) for tenant-scoped FTS queries.
-- Without this, PostgreSQL would use the GIN index + bitmap heap scan +
-- filter on organization_id. With it: index-only scan narrows by org first.
-- NOTE: GIN indexes cannot be part of composite indexes in PostgreSQL.
-- Tenant filtering happens in WHERE clause; planner will combine GIN + btree scans.
-- The existing @@index([organizationId]) on candidates handles the tenant filter.

-- Validate the column was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'search_vector'
  ) THEN
    RAISE EXCEPTION 'Migration failed: search_vector column not created on candidates table';
  END IF;
END $$;
