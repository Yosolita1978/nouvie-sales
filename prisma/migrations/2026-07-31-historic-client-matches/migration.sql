-- Migration: link the clients in the old sales sheet to real customers.
--
-- Why: the important part of the historic data is not "how much product sold in
-- 2024", it is "which clients bought in 2024/2025/2026, and who has not bought
-- in the last 6 months". That needs each historic name resolved to a customer.
--
-- Two things:
--   1. customers.origin — tells apart records created normally in the platform
--      ("app") from those created out of the historic sheet ("historico").
--      Existing rows all become "app". Nothing else about customers changes.
--   2. historic_client_matches — one row per historic client name.
--
-- Safe to re-run: every statement is guarded.
-- Run once against the shared DB.

BEGIN;

-- 1. Provenance flag on customers. Additive, with a default, so existing rows
--    and existing inserts are unaffected.
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'app';

CREATE INDEX IF NOT EXISTS "customers_origin_idx" ON "customers" ("origin");

-- 2. The match table.
CREATE TABLE IF NOT EXISTS "historic_client_matches" (
  "id"         TEXT NOT NULL,
  "clientKey"  TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "customerId" TEXT,
  "matchedBy"  TEXT NOT NULL,
  "confirmed"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "historic_client_matches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "historic_client_matches_clientKey_key"
  ON "historic_client_matches" ("clientKey");

-- One historic client per customer and vice versa.
CREATE UNIQUE INDEX IF NOT EXISTS "historic_client_matches_customerId_key"
  ON "historic_client_matches" ("customerId");

CREATE INDEX IF NOT EXISTS "historic_client_matches_confirmed_idx"
  ON "historic_client_matches" ("confirmed");

-- ON DELETE SET NULL: deleting a customer must never delete history, it just
-- leaves the historic client unlinked again.
ALTER TABLE "historic_client_matches"
  DROP CONSTRAINT IF EXISTS "historic_client_matches_customerId_fkey";
ALTER TABLE "historic_client_matches"
  ADD CONSTRAINT "historic_client_matches_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
