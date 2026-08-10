-- ============================================================================
-- Catalogue reset (client request: "clear all and add new from the admin panel").
-- Removes the seeded MAIN collections and their products so the client can build
-- the real catalogue from /admin. KEEPS the special collections + their products
-- (Customized Notebook, Matching Set) so the special-collection pages and the
-- customized-notebook flow keep working.
-- Run in the Supabase SQL Editor after 0003_admin.sql.
-- ============================================================================

-- Delete products that belong to non-special (main) collections.
delete from public.products
where collection_slug in (select slug from public.collections where is_special = false);

-- Delete the main collections themselves.
delete from public.collections
where is_special = false;

-- Note: to wipe EVERYTHING (including special collections + the Customized
-- Notebook / Matching Set), run instead:
--   delete from public.products;
--   delete from public.collections;
