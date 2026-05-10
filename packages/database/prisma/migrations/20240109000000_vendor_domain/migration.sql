-- Migration: vendor domain — vendors, vendor_contacts, vendor_notes
-- Depends on: note_type enum (migration 20240104+)

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE vendor_status AS ENUM (
  'PROSPECT', 'ACTIVE', 'INACTIVE', 'BLOCKED', 'ARCHIVED'
);

CREATE TYPE vendor_priority AS ENUM (
  'LOW', 'NORMAL', 'HIGH', 'STRATEGIC'
);

CREATE TYPE vendor_type AS ENUM (
  'STAFFING_AGENCY', 'CONSULTING_FIRM', 'FREELANCE_PLATFORM',
  'RECRUITMENT_PARTNER', 'DIRECT_CLIENT', 'OTHER'
);

-- ── vendors ───────────────────────────────────────────────────────────────────

CREATE TABLE vendors (
  id                    UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID          NOT NULL REFERENCES organizations(id),

  -- Identity
  company_name          VARCHAR(255)  NOT NULL,
  vendor_code           VARCHAR(50),
  website               VARCHAR(2048),
  type                  vendor_type   NOT NULL DEFAULT 'STAFFING_AGENCY',

  -- Lifecycle
  status                vendor_status   NOT NULL DEFAULT 'PROSPECT',
  priority              vendor_priority NOT NULL DEFAULT 'NORMAL',

  -- Location
  city                  VARCHAR(100),
  state_province        VARCHAR(100),
  country               VARCHAR(100),
  timezone              VARCHAR(50),

  -- Primary contact (denormalised for list performance)
  primary_contact_name  VARCHAR(255),
  primary_contact_email VARCHAR(255),
  primary_contact_phone VARCHAR(50),

  -- Relationship ownership (plain UUID, no FK — resolved at app layer)
  relationship_owner_id UUID,

  -- Business terms
  domains               TEXT[]        NOT NULL DEFAULT '{}',
  description           TEXT,
  contract_details      TEXT,
  commission_rate       DECIMAL(5, 2),
  payment_terms_days    INTEGER,

  -- Full-text search (populated by trigger below)
  search_vector         TSVECTOR,

  -- Timestamps
  activated_at          TIMESTAMPTZ,
  last_contacted_at     TIMESTAMPTZ,
  last_activity_at      TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  deleted_by UUID
);

-- Case-insensitive name uniqueness per org (soft-delete aware)
-- Deleted vendors do NOT block re-creation of the same name.
CREATE UNIQUE INDEX idx_vendors_org_name_ci
  ON vendors (organization_id, lower(company_name))
  WHERE deleted_at IS NULL;

-- Vendor code uniqueness (nullable — only set after creation)
CREATE UNIQUE INDEX idx_vendors_vendor_code
  ON vendors (organization_id, vendor_code)
  WHERE vendor_code IS NOT NULL AND deleted_at IS NULL;

-- Filter / sort indexes
CREATE INDEX idx_vendors_org_status       ON vendors (organization_id, status)       WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_org_priority     ON vendors (organization_id, priority)     WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_org_type         ON vendors (organization_id, type)         WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_org_deleted      ON vendors (organization_id, deleted_at);
CREATE INDEX idx_vendors_org_activity     ON vendors (organization_id, last_activity_at DESC NULLS LAST) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_org_created      ON vendors (organization_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_org_owner        ON vendors (organization_id, relationship_owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_search_vector    ON vendors USING GIN (search_vector);

-- ── FTS trigger ───────────────────────────────────────────────────────────────
-- Weights: company_name(A), primary_contact_name(B), domains joined(C), description(D)

CREATE OR REPLACE FUNCTION vendors_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.company_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.primary_contact_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.domains, ' '), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendors_search_vector_trigger
  BEFORE INSERT OR UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION vendors_search_vector_update();

-- ── vendor_contacts ───────────────────────────────────────────────────────────

CREATE TABLE vendor_contacts (
  id             UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      UUID         NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id),

  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  title          VARCHAR(255),
  email          VARCHAR(255) NOT NULL,
  phone          VARCHAR(50),
  linkedin_url   VARCHAR(2048),
  is_primary     BOOLEAN      NOT NULL DEFAULT false,
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  notes          TEXT,

  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by     UUID
);

CREATE INDEX idx_vendor_contacts_vendor ON vendor_contacts (vendor_id);
CREATE INDEX idx_vendor_contacts_org    ON vendor_contacts (organization_id);

-- ── vendor_notes ──────────────────────────────────────────────────────────────

CREATE TABLE vendor_notes (
  id             UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      UUID        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  organization_id UUID       NOT NULL REFERENCES organizations(id),

  content        TEXT        NOT NULL,
  note_type      note_type   NOT NULL DEFAULT 'NOTE',

  author_id      UUID,
  author_email   VARCHAR(255),
  author_name    VARCHAR(255),

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_notes_vendor ON vendor_notes (vendor_id, created_at DESC);
CREATE INDEX idx_vendor_notes_org    ON vendor_notes (organization_id);
