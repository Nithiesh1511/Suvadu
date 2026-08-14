-- ============================================================================
-- 0006 — Collection cover images
--
-- Adds an optional cover image per collection, managed from Admin → Collections.
-- The image is stored inline as a base64 data URL (`data:image/jpeg;base64,...`)
-- rather than as a Storage object, so no bucket or Storage policy is involved
-- and there is nothing to clean up when a collection's image changes. The admin
-- form downscales covers before encoding to keep the row small. An http(s) URL
-- is also accepted here, which is what the seeded rows use.
--
-- Nullable by design: a collection with no uploaded image keeps rendering the
-- generated NotebookCover from its accent colour + pattern, so this is a
-- non-breaking change and existing rows need no backfill.
-- ============================================================================

alter table public.collections
  add column if not exists image_url text;

comment on column public.collections.image_url is
  'Collection cover image: a base64 data URL (written by Admin → Collections) or an http(s) URL. Null = fall back to the generated NotebookCover.';
