-- bit cafe: admin-managed content
-- -----------------------------------------------------------------
-- run this once in your Supabase project's SQL editor, same way you ran
-- schema.sql (Project -> SQL Editor -> New query -> paste this whole
-- file -> Run). it creates the two tables the /admin backend manages:
-- articles (the reading menu) and movies (movie night's screenings).
--
-- unlike every table in schema.sql, nobody writes to these from the
-- browser at all -- not even shape-checked anonymous writes. the anon
-- key gets read-only access to published rows; every insert/update/
-- delete happens from a Cloudflare Pages Function using the
-- service_role key, which bypasses RLS entirely (that's what makes it
-- secret -- see README.md's admin setup section). so these policies
-- are simpler than chat/guestbook/notices: one read policy, nothing
-- else.

-- ---- articles (the reading menu) ----------------------------------------
create table if not exists articles (
  id bigint generated always as identity primary key,
  slug text not null unique check (char_length(slug) <= 80),
  title text not null check (char_length(title) <= 120),
  dek text not null check (char_length(dek) <= 200),
  byline text not null default 'dot_matrix' check (char_length(byline) <= 60),
  body_html text not null,
  pull_quote text check (pull_quote is null or char_length(pull_quote) <= 400),
  pull_cite text check (pull_cite is null or char_length(pull_cite) <= 100),
  read_minutes int not null default 5 check (read_minutes between 1 and 60),
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table articles enable row level security;

create policy "published articles are publicly readable"
  on articles for select
  using (published = true);

-- ---- movies (movie night's screenings) -----------------------------------
create table if not exists movies (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) <= 120),
  year int,
  rating text check (rating is null or char_length(rating) <= 20),
  director text check (director is null or char_length(director) <= 120),
  writer text check (writer is null or char_length(writer) <= 200),
  stars text check (stars is null or char_length(stars) <= 300),
  synopsis text not null check (char_length(synopsis) <= 600),
  poster_key text,
  poster_url text,
  video_key text,
  video_url text,
  bytes bigint,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table movies enable row level security;

create policy "published movies are publicly readable"
  on movies for select
  using (published = true);

-- note: site_submissions (the webring's "request a spot" form, already
-- created by schema.sql) needs no change here -- it already has no
-- select policy for anon, so it was already unreadable from the
-- browser. the admin backend reads/deletes it with the service_role
-- key, which bypasses RLS regardless of what policies exist.
