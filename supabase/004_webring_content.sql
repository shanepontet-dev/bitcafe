-- bit cafe: webring content the /admin backend manages
-- -----------------------------------------------------------------
-- run this once in your Supabase project's SQL editor, same way you ran
-- schema.sql and 002_articles_movies.sql (Project -> SQL Editor -> New
-- query -> paste this whole file -> Run). it creates the two tables
-- the /admin "webring" tab manages: featured_sites (the "sites we
-- love" coupon strip at the top of links.html) and wall_buttons (the
-- 88x31-style button wall further down that page, plus the newest few
-- on the homepage's "a few doors out").
--
-- same policy shape as articles/movies in 002_articles_movies.sql:
-- nobody writes to these from the browser at all, not even
-- shape-checked anonymous writes. the anon key gets read-only access
-- to published rows; every insert/update/delete happens from the
-- Worker using the service_role key, which bypasses RLS entirely.
--
-- the site's original hand-written coupons and badges stay put in
-- links.html/index.html's own markup -- these tables only hold what
-- gets *added* on top of those through /admin, so an empty table is a
-- perfectly normal, fully-working state (see js/webring.js).

-- ---- featured_sites ("sites we love" coupon strip) ----------------------
create table if not exists featured_sites (
  id bigint generated always as identity primary key,
  site_name text not null check (char_length(site_name) <= 60),
  url text not null check (char_length(url) <= 300),
  description text not null check (char_length(description) <= 280),
  button_style text not null default 'default' check (button_style in ('default', 'red', 'teal')),
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table featured_sites enable row level security;

create policy "published featured sites are publicly readable"
  on featured_sites for select
  using (published = true);

-- ---- wall_buttons (the button wall) --------------------------------------
create table if not exists wall_buttons (
  id bigint generated always as identity primary key,
  site_name text not null check (char_length(site_name) <= 60),
  url text not null check (char_length(url) <= 300),
  tagline text check (tagline is null or char_length(tagline) <= 120),
  image_key text not null,
  image_url text not null,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wall_buttons enable row level security;

create policy "published wall buttons are publicly readable"
  on wall_buttons for select
  using (published = true);

-- no realtime here -- like articles/movies, this is admin-authored
-- content nobody needs to see update live in another open tab.
