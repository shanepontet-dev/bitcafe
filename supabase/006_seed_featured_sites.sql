-- bit cafe: seed "sites we love" from the site's original hand-written
-- coupon strip
-- -----------------------------------------------------------------
-- run this once in the Supabase SQL editor, AFTER
-- 004_webring_content.sql (and 005_featured_sites_artwork.sql, though
-- that one doesn't matter here -- these rows are inserted with no
-- artwork, same as every hand-written coupon they replace). moves the
-- 6 coupons that used to be hard-coded in links.html into real rows,
-- so they show up in /admin's webring tab and can finally be edited
-- or deleted there instead of only by hand-editing HTML. mirrors what
-- 003_seed_content.sql did for the original articles/movies.
--
-- this is a one-time migration, not something to re-run: running it
-- twice duplicates these 6 rows (featured_sites has no unique
-- constraint to stop it, unlike articles.slug).
--
-- after running this, links.html's coupon-strip markup itself no
-- longer contains these 6 <div class="coupon"> blocks -- they render
-- from this table now, same as anything added through /admin.

insert into featured_sites (site_name, url, description, button_style, published, sort_order, created_at) values
  ('melonland', 'https://melonking.net', 'one of the loudest, funniest personal pages left on the internet. glorious chaos, run with real love. this is a lot of where bit cafe''s nerve came from.', 'default', true, 0, '2026-07-01T12:00:00Z'::timestamptz),
  ('ribo.zone', 'https://ribo.zone/links', 'a personal site built like a laboratory: links, drawings, plants, bugs, whatever the owner felt like building that week. their own links page is exactly what a real button wall looks like: go see it firsthand.', 'default', true, 1, '2026-07-01T12:01:00Z'::timestamptz),
  ('lost letters', 'https://lostletters.neocities.org', 'a nostalgic tribute to early-2000s online girlhood, built accessible and tracker-free on purpose. proof that "indie" and "considerate" were never in tension.', 'default', true, 2, '2026-07-01T12:02:00Z'::timestamptz),
  ('neocities', 'https://neocities.org', 'free, ad-free hosting for pages like this one. if any of this made you want to build your own corner of the web, this is where you''d actually start.', 'default', true, 3, '2026-07-01T12:03:00Z'::timestamptz),
  ('indieweb wiki', 'https://indieweb.org', 'a community wiki for people building small, self-owned sites instead of renting space on somebody else''s platform. dense, useful, unglamorous in the best way.', 'default', true, 4, '2026-07-01T12:04:00Z'::timestamptz),
  ('hotline webring', 'https://hotlinewebring.club', 'an actual, currently running webring, not a directory pretending to be one: pick a slug, add a next/previous link, get pulled into the chain for real. this is the one from the note below.', 'red', true, 5, '2026-07-01T12:05:00Z'::timestamptz);
