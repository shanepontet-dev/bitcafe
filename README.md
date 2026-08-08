# bit cafe

an internet café for the terminally online. read the house zine, order a
joke coffee, talk live in the chatroom, sign the guestbook on your way out.

no build step, no framework, no bundler. plain HTML, CSS, and a little
vanilla JS. open `index.html` in a browser and the whole site works —
except the chatroom and guestbook, which need five minutes of setup
first (below), because they're real: other visitors' messages actually
show up, not a static mockup of them.

## running it locally

there's nothing to build. either:

- open `index.html` directly in a browser, or
- serve the folder so relative paths and `fetch`/module imports behave
  exactly like they will in production:

  ```bash
  npx serve .
  # or: python3 -m http.server 8080
  ```

## connecting the till (chat, guestbook, notices, webring requests)

the chatroom (`chat.html`), guestbook (`guestbook.html`), notice board
(`notices.html`), and the webring's "request a spot" form (`links.html`)
are all wired for [Supabase](https://supabase.com/) — Postgres plus a
built-in realtime layer, free at hobby scale, needing no server of your
own, just a client-side config. until you do this, each page detects the
missing config and shows an honest "not connected yet" notice instead of
silently failing.

1. go to [supabase.com](https://supabase.com/) and create a free account,
   then **New project** (pick any name/region; the free tier is enough).
2. once the project finishes provisioning, open the **SQL Editor** in the
   left sidebar, **New query**, paste in the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. that
   one file creates all four tables, locks them down with row-level
   security (see below), and turns on realtime for the three that need
   live updates.
3. open **Project settings → API**. you need two values: the **Project
   URL** and the **anon public** key (not the `service_role` key — that
   one's secret and never belongs in client code).
4. copy those into [`js/supabase-config.js`](js/supabase-config.js),
   replacing the two `PASTE_YOUR_...` placeholders.
5. reload `chat.html` or `guestbook.html`. the chatroom's status pill
   should flip from "connecting…" to "live."

### database policies

there are no user accounts, so the row-level security policies in
`supabase/schema.sql` validate *shape*, not *identity* — anyone can
write, but not anything. each table has RLS turned on plus:

- `chat_messages`, `guestbook_entries`, `board_notices` — public read,
  and insert only if the row fits the same length limits the client
  already enforces (nick ≤ 20/24 chars, message/text within its cap,
  etc.) — belt and suspenders, since a client check alone can always be
  bypassed by anyone calling the API directly.
- `site_submissions` (the "request a spot on the wall" form on
  `links.html`) is **insert-only** from the client on purpose — no select
  policy is granted at all, so anyone can file a request but nobody can
  read the list back through the app. you'll read them yourself in the
  Supabase dashboard's **Table Editor**, which always has full access
  regardless of these policies. requests are never published
  automatically; the button wall only grows when you hand-edit
  `links.html` after reading one you like.

realtime is enabled (via `supabase_realtime` publication, at the bottom
of the schema file) for `chat_messages`, `guestbook_entries`, and
`board_notices` — the three lists that need to update live for everyone
in the room. `site_submissions` doesn't need it since nobody reads it
live.

### the till has no bouncer

worth saying plainly: there are no accounts, no login, and **no
moderation backend**. the policies above stop malformed data, not rude
data. anyone who finds the chatroom or guestbook can post anything that
fits the length limits. that's an accepted, disclosed limitation of a
hobby project, not an oversight — if you deploy this somewhere with real
traffic, you'll want to add moderation (a simple approach: a Supabase
Edge Function that scans new rows, or just checking the Table Editor
periodically yourself). the client already does the boring safety work
that *is* in scope — messages are rendered as text, never as HTML, so
nobody can inject markup or scripts through a chat message or guestbook
entry.

## deploying

it's static files — any static host works:

- **[Neocities](https://neocities.org)** — genuinely fitting, given the
  vibe. drag the folder in.
- **GitHub Pages** — push this folder to a repo, enable Pages on the
  `main` branch.
- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop deploy, no
  build command needed.

Whichever you pick, remember `js/supabase-config.js` is a public client
file (that's normal for Supabase — the anon key is meant to be public;
protection comes from the row-level security policies, not from hiding
the keys).

## the one external dependency

everything on this site is self-contained except one thing: **exporting a
coffee order as an animated GIF** (`coffee.html`, "save as .gif") loads
[gif.js](https://github.com/jnordberg/gif.js) from a CDN, on demand, only
the moment someone clicks that button — browsers have no built-in GIF
encoder, so this is the standard way to build one client-side. it never
loads on page view, and the "save as .jpg" export next to it needs
nothing extra (`canvas.toDataURL` is built into every browser).

## file map

```
index.html            front counter / homepage
articles.html          the reading menu (article index)
articles/*.html         five essays, written in-house
coffee.html            order digital coffee; spends real bits (see below),
                       animated pixel cup, exportable as .jpg / .gif
fishing.html           gone fishin': cast, reel in, take the fish; pays
                       out bits, spendable on coffee
chat.html              live chatroom (needs Supabase, see above)
guestbook.html         guestbook (needs Supabase, see above)
links.html             webring: featured sites, an 88x31 button wall,
                       a random-link door, and a "request a spot" form
notices.html            the notice board: pinned updates + visitor pins
movie-night.html        video screenings, linked from the notice board
404.html               not-found page
css/style.css          the whole design system, one file
js/common.js           clock, print-reveal effect, ticket numbers, the
                       shared bits balance + coin-purse rendering
js/chat.js             chatroom logic (Supabase Postgres + realtime)
js/guestbook.js        guestbook logic (Supabase Postgres + realtime)
js/webring.js          random-link door + site-submission form (Supabase)
js/notices.js           notice board logic (Supabase Postgres + realtime)
js/movie-night.js       video player controls for movie-night.html
js/coffee.js           the coffee-ordering toy; checks and spends bits
js/pixel-cup.js        the pixel-art cup renderer + jpg/gif export
js/fishing.js           the fishing game's state machine + catch table
js/supabase-config.js  your database keys go here
supabase/schema.sql    run once in the Supabase SQL editor: creates the
                       tables, row-level security policies, and turns
                       on realtime (see "connecting the till" above)
img/badges/*.svg       hand-made 88x31 tribute badges for the button wall
img/fishing/*.png       fishing sprites/background, from two free
                       itch.io pixel-art packs (see fishing.html's
                       footer and media/ for the originals/licenses)
PRODUCT.md             product brief this site was built from
DESIGN.md              the visual system this site was built to
```

## bits: the house currency

everyone who walks in starts with 10 bits (tracked client-side in
`localStorage`, same honesty caveat as the ticket number in
`js/common.js` — it's a local counter, not a server-verified balance).
catch fish on `fishing.html` to earn more, spend them at the counter
on `coffee.html`. the coin purse next to the "open" sign on every page
shows the current balance and links to `fishing.html`. there's no
real money anywhere in this loop — bits aren't purchasable, and
nothing they buy ships or costs anything outside the till.

## swapping in real content

the five articles under `articles/` are original placeholder writing —
swap the copy for your own whenever you're ready, the markup and byline
pattern will carry over fine. the "dot_matrix" persona, the coffee menu,
and the webring picks are yours to keep, rename, or replace outright.
