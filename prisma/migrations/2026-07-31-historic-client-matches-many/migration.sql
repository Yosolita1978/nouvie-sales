-- Migration: allow several historic client names to point at the SAME customer.
--
-- Why: the old sheet writes one person in several ways — "Jaime Perilla",
-- "Jaime Alberto Perilla", "Jaime Alberto Perilla Gomez" are the same buyer.
-- The original UNIQUE on customerId let only the first spelling be linked and
-- left the others impossible to resolve, which would split that person's
-- purchase history and make the 6-month dormancy report wrong for them.
--
-- Safe to re-run.

BEGIN;

DROP INDEX IF EXISTS "historic_client_matches_customerId_key";

CREATE INDEX IF NOT EXISTS "historic_client_matches_customerId_idx"
  ON "historic_client_matches" ("customerId");

COMMIT;
