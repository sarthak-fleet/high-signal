-- Add 'killed' as a fourth review status. The auto-publish judge needs to
-- mark drafts as explicitly *rejected* without overloading 'corrected'
-- (which means "this signal was wrong, here's the new one citing it").
--
-- SQLite enums are enforced at the Drizzle level, not the DB level, so this
-- is a no-op SQL migration that exists only to keep the migration ledger
-- aligned with the schema change in packages/db/src/schema.ts.
--
-- The brief route already filters on `review_status='published'`, so killed
-- rows are invisible to the brief without any further change.

-- (no SQL changes; enum is enforced in code)
SELECT 1;
