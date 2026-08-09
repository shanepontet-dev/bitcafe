-- bit cafe: add save-europe-act.com to "sites we love"
-- -----------------------------------------------------------------
-- run this once in the Supabase SQL editor, same as 006/007. the 5th
-- of the 5 sites originally requested alongside 007's four -- held
-- back from that migration pending direct confirmation it was
-- actually wanted (it's a political campaign site, not an indie-web/
-- nostalgia pick like the other four), which has now been given.
--
-- this is a one-time migration, not something to re-run: running it
-- twice duplicates this row (featured_sites has no unique constraint
-- to stop it).

insert into featured_sites (site_name, url, description, button_style, published, sort_order, created_at) values (
  'save europe act',
  'https://www.save-europe-act.com/',
  'a European Citizens'' Initiative petition site campaigning for stricter EU immigration policy -- a cause, not a webring pick like the rest of this strip, here because fletcher wanted it linked.',
  'default',
  true,
  10,
  '2026-08-09T13:00:00Z'::timestamptz
);
