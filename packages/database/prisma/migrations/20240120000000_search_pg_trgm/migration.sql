-- ─── Migration: Trigram fuzzy-search foundation ──────────────────────────────
--
-- Layered on top of the existing tsvector FTS columns (candidate_fts, job_fts,
-- vendors_search_vector). FTS gives us prefix-token AND/OR with relevance
-- ranking; trigram gives us typo tolerance and partial-word recall.
--
-- The repositories combine both via OR: FTS hits dominate the ranking,
-- trigram matches supply additional recall when the user mistypes or types
-- the middle of a word ("husa" → "abusuhail").
--
-- The `%` operator returns true when similarity ≥ pg_trgm.similarity_threshold
-- (default 0.3 since PG 9.6). We keep the default — tuned for short names
-- and titles — and avoid touching the GUC.
--
-- Indexes are GIN with gin_trgm_ops. Storage cost is ~2-5x the column data,
-- negligible at our scale. CREATE INDEX IF NOT EXISTS keeps this migration
-- safe to re-run.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Candidates ─────────────────────────────────────────────────────────────
-- The four fields users actually search by name. Other fields stay covered
-- by the existing search_vector tsvector.
CREATE INDEX IF NOT EXISTS candidates_first_name_trgm_idx
  ON candidates USING GIN (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS candidates_last_name_trgm_idx
  ON candidates USING GIN (last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS candidates_email_trgm_idx
  ON candidates USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS candidates_current_title_trgm_idx
  ON candidates USING GIN (current_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS candidates_current_company_trgm_idx
  ON candidates USING GIN (current_company gin_trgm_ops);

-- ── Jobs (job_descriptions) ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS job_descriptions_title_trgm_idx
  ON job_descriptions USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS job_descriptions_department_trgm_idx
  ON job_descriptions USING GIN (department gin_trgm_ops);
CREATE INDEX IF NOT EXISTS job_descriptions_req_id_trgm_idx
  ON job_descriptions USING GIN (req_id gin_trgm_ops);

-- ── Vendors ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS vendors_company_name_trgm_idx
  ON vendors USING GIN (company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS vendors_primary_contact_name_trgm_idx
  ON vendors USING GIN (primary_contact_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS vendors_primary_contact_email_trgm_idx
  ON vendors USING GIN (primary_contact_email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS vendors_vendor_code_trgm_idx
  ON vendors USING GIN (vendor_code gin_trgm_ops);

-- ── Validate ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
  ) THEN
    RAISE EXCEPTION 'Migration failed: pg_trgm extension not enabled';
  END IF;
END $$;
