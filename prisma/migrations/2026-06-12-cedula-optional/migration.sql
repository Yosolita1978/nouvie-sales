-- Migration: make customers.cedula optional (nullable) for informal sales.
--
-- 1. Drop NOT NULL on cedula so customers can be saved without a document.
-- 2. Normalize any existing empty-string cédulas to NULL, so the UNIQUE index
--    does not collide on "" for a second cédula-less customer.
--
-- The UNIQUE constraint on cedula is KEPT. Postgres treats NULLs as distinct,
-- so multiple cédula-less customers are allowed (no partial index needed).
--
-- Run once against the shared DB using DIRECT_URL.

ALTER TABLE "customers" ALTER COLUMN "cedula" DROP NOT NULL;

UPDATE "customers" SET "cedula" = NULL WHERE "cedula" = '';
