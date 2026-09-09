-- Purge the dead Finalized-filter reasoning field (finalized-reasoning purge).
-- Pre-flight check (run before applying; verify the count is 0, else halt):
--   SELECT COUNT(*) FROM submission_final_filters WHERE notes IS NOT NULL;
-- Expected: 0 — no writer ever produced a non-null value (the lead decision
-- form hardcoded null since the filter grid existed). Verified 0 in the local
-- database before this migration was run; all 32 rows survived the drop.
ALTER TABLE "submission_final_filters" DROP COLUMN "notes";