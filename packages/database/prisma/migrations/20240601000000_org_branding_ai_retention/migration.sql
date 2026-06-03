-- ─── Migration: Organization branding + AI budget + retention policy ────────
--
-- Per ADR-001 / ADR-004 / ADR-006 / ADR-007. Adds the columns required by
-- Pre-Phase-1 to land tenant branding overrides, AI cost control, and the
-- retention-policy scaffold (UI ships in Phase 7). All columns are nullable
-- or carry a safe default so existing rows are unaffected.

ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "brand_accent_h"    INTEGER,
  ADD COLUMN IF NOT EXISTS "brand_accent_s"    INTEGER,
  ADD COLUMN IF NOT EXISTS "brand_accent_l"    INTEGER,
  ADD COLUMN IF NOT EXISTS "data_region"       VARCHAR(32) NOT NULL DEFAULT 'us-east-1',
  ADD COLUMN IF NOT EXISTS "ai_enabled"        BOOLEAN     NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "ai_budget_tokens"  BIGINT      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ai_used_tokens"    BIGINT      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ai_budget_reset_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "retention_policy"  JSONB NOT NULL DEFAULT
    '{"candidatesYears":7,"resumesYears":7,"auditLogsMonths":18,"notificationsMonths":12,"aiUsageLogsMonths":24,"exportArtifactsDays":30,"deletionGracePeriodDays":30}'::jsonb;

-- Safe-range constraints. Reject values that would break AA contrast or
-- denote an unsupported region.
ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_brand_h_range"
    CHECK ("brand_accent_h" IS NULL OR ("brand_accent_h" BETWEEN 0 AND 360));
ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_brand_s_range"
    CHECK ("brand_accent_s" IS NULL OR ("brand_accent_s" BETWEEN 40 AND 95));
ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_brand_l_range"
    CHECK ("brand_accent_l" IS NULL OR ("brand_accent_l" BETWEEN 45 AND 72));
ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_data_region_known"
    CHECK ("data_region" IN ('us-east-1', 'eu-west-1', 'ap-southeast-1'));
ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_ai_budget_nonneg"
    CHECK ("ai_budget_tokens" >= 0 AND "ai_used_tokens" >= 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'organizations'
       AND column_name = 'retention_policy'
  ) THEN
    RAISE EXCEPTION 'Migration failed: retention_policy column not created';
  END IF;
END $$;
