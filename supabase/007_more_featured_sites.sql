-- bit cafe: more "sites we love" picks
-- -----------------------------------------------------------------
-- run this once in the Supabase SQL editor, same as 006. adds 4 more
-- featured_sites rows requested directly (not moved out of hand-written
-- HTML like 006's were) -- they'll show up in /admin's webring tab
-- and on links.html's coupon strip once this runs.
--
-- a 5th requested site, save-europe-act.com, is deliberately left out
-- of this migration -- it's a political campaign site (a European
-- citizens'-initiative petition around immigration policy), not an
-- indie-web/nostalgia site like the other four, and wasn't added
-- without checking back first. see the assistant's note where this
-- file was introduced if you're reading this later and wondering why
-- there are 4 rows here instead of 5.
--
-- this is a one-time migration, not something to re-run: running it
-- twice duplicates these 4 rows (featured_sites has no unique
-- constraint to stop it).

insert into featured_sites (site_name, url, description, button_style, published, sort_order, created_at) values
  ('neopets', 'https://www.neopets.com/home/', 'the virtual pet site that ran a huge chunk of everyone''s 2000s childhood internet: feed a pet, play the minigames, trade in the marketplace, argue about the stock market. still running, still weirdly deep.', 'default', true, 6, '2026-08-09T12:00:00Z'::timestamptz),
  ('grundo''s cafe', 'https://grundos.cafe/', 'an unofficial, closed-beta virtual pet community built in the same spirit as old-school Neopets (the name''s a dead giveaway) -- invite/referral-gated for now, applications open if you want in.', 'default', true, 7, '2026-08-09T12:01:00Z'::timestamptz),
  ('pony town', 'https://pony.town/', 'a browser-based multiplayer town where everyone''s a customizable pony: chat, roleplay, hang out in real time with strangers who share a very specific, very 2010s brand of horse-shaped whimsy.', 'default', true, 8, '2026-08-09T12:02:00Z'::timestamptz),
  ('piczo', 'https://www.piczo.com/', 'the mid-2000s teen personal-homepage builder -- pick a color, a font, a song that autoplays whether anyone wants it to or not -- back from the dead as a small revival aiming to make the internet feel handmade again.', 'default', true, 9, '2026-08-09T12:03:00Z'::timestamptz);
