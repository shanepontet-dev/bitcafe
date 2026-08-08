-- bit cafe: optional artwork for "sites we love" coupons
-- -----------------------------------------------------------------
-- run this once in your Supabase project's SQL editor, same way as
-- the earlier numbered migrations. adds two nullable columns to
-- featured_sites (created in 004_webring_content.sql): when a coupon
-- has image_url set, links.html swaps its "visit X ->" text button
-- for that image instead -- see js/webring.js. a coupon with no
-- image keeps behaving exactly as before, so this is safe to run
-- against existing rows (they just get NULLs and render unchanged).
--
-- no RLS change needed -- the existing "published = true" select
-- policy on featured_sites already covers these two new columns.

alter table featured_sites add column if not exists image_key text;
alter table featured_sites add column if not exists image_url text;
