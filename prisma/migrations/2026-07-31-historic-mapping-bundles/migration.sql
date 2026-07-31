-- Migration: historic product mappings can expand into MANY products, be
-- scoped to a single CSV line, or be ignored entirely.
--
-- Why: the client confirmed that many unmapped texts are promo boxes/kits that
-- contain several products ("2 cajas día de la madre" = 6 units across 6
-- products), that some texts are parser noise that must NOT be counted
-- ("capilar:", "nov", "los"), and that the same word means different things on
-- different lines ("kiwi" alone vs. "kiwi" inside a kit).
--
-- Existing 1-to-1 mappings are PRESERVED: each one becomes a rule with a single
-- component of quantity 1, which counts exactly the same as before.
--
-- Touches only the historic_* tables. customers / products / orders unaffected.
-- Run once against the shared DB using DIRECT_URL.

BEGIN;

-- 1. New columns on the existing rules table.
ALTER TABLE "historic_product_mappings"
  ADD COLUMN IF NOT EXISTS "rowNumber" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ignored" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "multiplyByQuantity" BOOLEAN NOT NULL DEFAULT true;

-- 2. The components table.
CREATE TABLE IF NOT EXISTS "historic_mapping_components" (
  "id"          TEXT NOT NULL,
  "mappingId"   TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity"    INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "historic_mapping_components_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "historic_mapping_components_mappingId_idx"
  ON "historic_mapping_components" ("mappingId");

ALTER TABLE "historic_mapping_components"
  DROP CONSTRAINT IF EXISTS "historic_mapping_components_mappingId_fkey";
ALTER TABLE "historic_mapping_components"
  ADD CONSTRAINT "historic_mapping_components_mappingId_fkey"
  FOREIGN KEY ("mappingId") REFERENCES "historic_product_mappings"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Carry every existing 1-to-1 mapping over as a single component.
--    Guarded so re-running the migration cannot duplicate components.
INSERT INTO "historic_mapping_components" ("id", "mappingId", "productName", "quantity")
SELECT gen_random_uuid()::text, m."id", m."productName", 1
FROM "historic_product_mappings" m
WHERE m."productName" IS NOT NULL
  AND m."productName" <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "historic_mapping_components" c WHERE c."mappingId" = m."id"
  );

-- 4. productName is now held in the components table.
ALTER TABLE "historic_product_mappings" DROP COLUMN IF EXISTS "productName";

-- 5. Uniqueness is now (unmappedName, rowNumber): one global rule plus any
--    number of line-specific ones.
ALTER TABLE "historic_product_mappings"
  DROP CONSTRAINT IF EXISTS "historic_product_mappings_unmappedName_key";
DROP INDEX IF EXISTS "historic_product_mappings_unmappedName_key";

CREATE UNIQUE INDEX IF NOT EXISTS "historic_product_mappings_unmappedName_rowNumber_key"
  ON "historic_product_mappings" ("unmappedName", "rowNumber");

COMMIT;
