-- bit cafe: database schema
-- -----------------------------------------------------------------
-- run this once in your Supabase project's SQL editor (Project ->
-- SQL Editor -> New query -> paste this whole file -> Run). it creates
-- the four tables the till needs, locks them down with row-level
-- security so writes are shape-checked but nobody can turn off RLS
-- from the client, and turns on realtime so chat/guestbook/notices
-- update live for everyone in the room. see README.md, "connecting
-- the till" for the full walkthrough.
--
-- there are no user accounts, so like the old Firebase rules these
-- policies validate *shape*, not *identity* -- anyone can write, but
-- not anything. see README's "the till has no bouncer" for what that
-- does and doesn't cover.

-- ---- chatroom --------------------------------------------------------
create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  nick text not null check (char_length(nick) <= 20),
  text text not null check (char_length(text) between 1 and 300),
  ts bigint not null,
  created_at timestamptz not null default now()
);

alter table chat_messages enable row level security;

create policy "chat_messages are publicly readable"
  on chat_messages for select
  using (true);

create policy "anyone can post a chat message that fits the shape"
  on chat_messages for insert
  with check (
    char_length(nick) <= 20
    and char_length(text) between 1 and 300
  );

-- ---- guestbook ---------------------------------------------------------
create table if not exists guestbook_entries (
  id bigint generated always as identity primary key,
  nick text not null check (char_length(nick) <= 24),
  message text not null check (char_length(message) between 1 and 240),
  ts bigint not null,
  created_at timestamptz not null default now()
);

alter table guestbook_entries enable row level security;

create policy "guestbook_entries are publicly readable"
  on guestbook_entries for select
  using (true);

create policy "anyone can sign the guestbook if it fits the shape"
  on guestbook_entries for insert
  with check (
    char_length(nick) <= 24
    and char_length(message) between 1 and 240
  );

-- ---- notice board --------------------------------------------------------
create table if not exists board_notices (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) <= 60),
  message text not null check (char_length(message) between 1 and 280),
  link text,
  posted_by text,
  ts bigint not null,
  created_at timestamptz not null default now()
);

alter table board_notices enable row level security;

create policy "board_notices are publicly readable"
  on board_notices for select
  using (true);

create policy "anyone can pin a notice that fits the shape"
  on board_notices for insert
  with check (
    char_length(title) <= 60
    and char_length(message) between 1 and 280
  );

-- ---- webring "request a spot" form --------------------------------------
-- write-only from the client on purpose: anyone can file a request,
-- nobody but the site owner can read the list back through the app
-- (no select policy is granted here at all). you read these yourself
-- in the Supabase dashboard's Table Editor, which always has full
-- access regardless of these policies. requests are never published
-- automatically -- the button wall only grows when you hand-edit
-- links.html after reading one you like.
create table if not exists site_submissions (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) <= 60),
  url text not null check (char_length(url) <= 300),
  pitch text not null check (char_length(pitch) <= 240),
  contact text,
  ts bigint not null,
  created_at timestamptz not null default now()
);

alter table site_submissions enable row level security;

create policy "anyone can file a site submission that fits the shape"
  on site_submissions for insert
  with check (
    char_length(name) <= 60
    and char_length(url) <= 300
    and char_length(pitch) <= 240
  );

-- ---- realtime -------------------------------------------------------
-- chat, guestbook, and the notice board push live updates to everyone
-- in the room; site_submissions doesn't need to (nobody reads it live).
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table guestbook_entries;
alter publication supabase_realtime add table board_notices;
