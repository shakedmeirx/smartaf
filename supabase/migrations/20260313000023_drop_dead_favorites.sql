-- Drop the original `favorites` table that was created in migration 1 but
-- superseded by `parent_favorites` (migration 20). The code never references
-- this table; the RLS policies written for it in migration 2 are also dropped.
--
-- Safe to run: DROP … IF EXISTS means this is idempotent even if already gone.

DROP TABLE IF EXISTS public.favorites CASCADE;
