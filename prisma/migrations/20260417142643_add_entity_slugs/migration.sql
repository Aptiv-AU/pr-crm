-- Add slug columns to Contact, Supplier, Client, Campaign, Coverage.
-- Backfill with deterministic ROW_NUMBER() disambiguation per organization.
-- unaccent is not installed on this Neon instance; we fall back to regex-only
-- slugify (diacritics collapse to hyphens, which is acceptable for backfill).

-- Helper slugify expression (inlined per column):
--   NULLIF(
--     regexp_replace(
--       regexp_replace(lower(COALESCE(NULLIF(<name>, ''), 'item')), '[^a-z0-9]+', '-', 'g'),
--       '^-+|-+$', '', 'g'
--     ),
--     ''
--   )
-- then COALESCE(..., 'item') to guarantee non-empty base.

-- ============================================================
-- Contact
-- ============================================================
ALTER TABLE "Contact" ADD COLUMN "slug" TEXT;

WITH base AS (
  SELECT
    id,
    "organizationId",
    "createdAt",
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(lower(COALESCE(NULLIF("name", ''), 'item')), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        ),
        ''
      ),
      'item'
    ) AS base_slug
  FROM "Contact"
),
ranked AS (
  SELECT
    id,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY "organizationId", base_slug ORDER BY "createdAt", id) AS rn
  FROM base
)
UPDATE "Contact" c SET "slug" = CASE
  WHEN r.rn = 1 THEN SUBSTRING(r.base_slug, 1, 60)
  ELSE SUBSTRING(r.base_slug, 1, 55) || '-' || r.rn::TEXT
END
FROM ranked r
WHERE c.id = r.id;

ALTER TABLE "Contact" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Contact_organizationId_slug_key" ON "Contact"("organizationId", "slug");

-- ============================================================
-- Supplier
-- ============================================================
ALTER TABLE "Supplier" ADD COLUMN "slug" TEXT;

WITH base AS (
  SELECT
    id,
    "organizationId",
    "createdAt",
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(lower(COALESCE(NULLIF("name", ''), 'item')), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        ),
        ''
      ),
      'item'
    ) AS base_slug
  FROM "Supplier"
),
ranked AS (
  SELECT
    id,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY "organizationId", base_slug ORDER BY "createdAt", id) AS rn
  FROM base
)
UPDATE "Supplier" s SET "slug" = CASE
  WHEN r.rn = 1 THEN SUBSTRING(r.base_slug, 1, 60)
  ELSE SUBSTRING(r.base_slug, 1, 55) || '-' || r.rn::TEXT
END
FROM ranked r
WHERE s.id = r.id;

ALTER TABLE "Supplier" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Supplier_organizationId_slug_key" ON "Supplier"("organizationId", "slug");

-- ============================================================
-- Client
-- ============================================================
ALTER TABLE "Client" ADD COLUMN "slug" TEXT;

WITH base AS (
  SELECT
    id,
    "organizationId",
    "createdAt",
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(lower(COALESCE(NULLIF("name", ''), 'item')), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        ),
        ''
      ),
      'item'
    ) AS base_slug
  FROM "Client"
),
ranked AS (
  SELECT
    id,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY "organizationId", base_slug ORDER BY "createdAt", id) AS rn
  FROM base
)
UPDATE "Client" cl SET "slug" = CASE
  WHEN r.rn = 1 THEN SUBSTRING(r.base_slug, 1, 60)
  ELSE SUBSTRING(r.base_slug, 1, 55) || '-' || r.rn::TEXT
END
FROM ranked r
WHERE cl.id = r.id;

ALTER TABLE "Client" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Client_organizationId_slug_key" ON "Client"("organizationId", "slug");

-- ============================================================
-- Campaign
-- ============================================================
ALTER TABLE "Campaign" ADD COLUMN "slug" TEXT;

WITH base AS (
  SELECT
    id,
    "organizationId",
    "createdAt",
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(lower(COALESCE(NULLIF("name", ''), 'item')), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        ),
        ''
      ),
      'item'
    ) AS base_slug
  FROM "Campaign"
),
ranked AS (
  SELECT
    id,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY "organizationId", base_slug ORDER BY "createdAt", id) AS rn
  FROM base
)
UPDATE "Campaign" cm SET "slug" = CASE
  WHEN r.rn = 1 THEN SUBSTRING(r.base_slug, 1, 60)
  ELSE SUBSTRING(r.base_slug, 1, 55) || '-' || r.rn::TEXT
END
FROM ranked r
WHERE cm.id = r.id;

ALTER TABLE "Campaign" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Campaign_organizationId_slug_key" ON "Campaign"("organizationId", "slug");

-- ============================================================
-- Coverage (uses publication as the slug seed — no name field)
-- ============================================================
ALTER TABLE "Coverage" ADD COLUMN "slug" TEXT;

WITH base AS (
  SELECT
    id,
    "organizationId",
    "createdAt",
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(lower(COALESCE(NULLIF("publication", ''), 'item')), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        ),
        ''
      ),
      'item'
    ) AS base_slug
  FROM "Coverage"
),
ranked AS (
  SELECT
    id,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY "organizationId", base_slug ORDER BY "createdAt", id) AS rn
  FROM base
)
UPDATE "Coverage" cv SET "slug" = CASE
  WHEN r.rn = 1 THEN SUBSTRING(r.base_slug, 1, 60)
  ELSE SUBSTRING(r.base_slug, 1, 55) || '-' || r.rn::TEXT
END
FROM ranked r
WHERE cv.id = r.id;

ALTER TABLE "Coverage" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Coverage_organizationId_slug_key" ON "Coverage"("organizationId", "slug");
