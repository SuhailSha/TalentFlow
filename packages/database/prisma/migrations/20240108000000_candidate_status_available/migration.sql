-- Migration: add AVAILABLE to candidate_status enum, remove DO_NOT_CONTACT
--
-- Step 1: Add the new value (safe — additive, no lock escalation)
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'AVAILABLE';

-- Step 2: Migrate any existing DO_NOT_CONTACT rows to INACTIVE before removing
UPDATE candidates SET status = 'INACTIVE' WHERE status = 'DO_NOT_CONTACT';

-- Step 3: Recreate the enum without DO_NOT_CONTACT
--   PostgreSQL requires creating a new type to remove a value:
--   a) drop the column default (it references the type by name)
--   b) rename old type
--   c) create new type
--   d) alter the column USING an explicit cast
--   e) re-add the default using the new type
--   f) drop the old type
ALTER TABLE candidates ALTER COLUMN status DROP DEFAULT;

ALTER TYPE candidate_status RENAME TO candidate_status_old;

CREATE TYPE candidate_status AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'AVAILABLE',
  'PLACED',
  'BLACKLISTED'
);

ALTER TABLE candidates
  ALTER COLUMN status TYPE candidate_status
  USING status::text::candidate_status;

ALTER TABLE candidates ALTER COLUMN status SET DEFAULT 'ACTIVE'::candidate_status;

DROP TYPE candidate_status_old;
