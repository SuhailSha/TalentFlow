-- ─── Migration: Job Description Full-Text Search ──────────────────────────────
-- Adds a GENERATED tsvector column to job_descriptions for full-text search.
-- GIN index enables fast phrase and ranked search queries.
--
-- Weight mapping (ts_rank priority):
--   A = title         (most important — recruiters search by role name)
--   B = department    (filter by team/function)
--   C = requirements  (skills and qualifications text)
--   D = description   (full JD narrative — lowest weight but still indexed)
--
-- Prisma 5 cannot represent GENERATED columns, so this column is added via
-- raw migration only. The repository uses $queryRaw for FTS queries.
--
-- NOTE: CREATE INDEX without CONCURRENTLY — Prisma runs migrations inside an
-- implicit transaction; CONCURRENTLY is not allowed inside a transaction block.

ALTER TABLE "job_descriptions"
    ADD COLUMN "search_vector" tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(department, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(requirements, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'D')
    ) STORED;

CREATE INDEX "job_descriptions_search_vector_gin_idx"
    ON "job_descriptions" USING GIN ("search_vector");
