-- Migration: store the results of the June 2026 phone campaign on the customer.
--
--   acceptsMarketing  the client said SI to receiving notifications. This is
--                     marketing consent (Habeas Data), so it belongs on the
--                     record and gets shown as a label in the customer list,
--                     not left inside a spreadsheet.
--   campaignNote      what the caller wrote down ("no contestan",
--                     "enviar informacion", "se los compra a una amiga").
--   lastContactedAt   when they were last called.
--
-- All three are additive and nullable/defaulted, so existing rows and existing
-- inserts are unaffected. Safe to re-run.

BEGIN;

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "acceptsMarketing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "campaignNote" TEXT,
  ADD COLUMN IF NOT EXISTS "lastContactedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "customers_acceptsMarketing_idx"
  ON "customers" ("acceptsMarketing");

COMMIT;
