-- ─── Migration: Add missing candidate indexes ─────────────────────────────────
--
-- Identified during post-Step-4B.1 architecture review.
--
-- 1. (organization_id, is_remote) — the isRemote filter in ListCandidatesDto
--    hits a full org-scoped scan without this. Remote-first filtering is a
--    common query pattern in the candidate list.
--
-- 2. (candidate_id, is_primary) — speeds up "top skills" sub-queries that
--    filter isPrimary=true, e.g. the matching engine prep queries.
--    The INCLUDE clause (covering index) avoids a heap fetch for skill_id.

CREATE INDEX IF NOT EXISTS "candidates_org_remote_idx"
    ON "candidates"("organization_id", "is_remote");

CREATE INDEX IF NOT EXISTS "candidate_skills_candidate_primary_idx"
    ON "candidate_skills"("candidate_id", "is_primary");
