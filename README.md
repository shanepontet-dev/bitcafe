# bit cafe

an internet café for the terminally online. read the house zine, order a
joke coffee, talk live in the chatroom, sign the guestbook on your way out.

no build step, no framework, no bundler on the public side. plain HTML,
CSS, and a little vanilla JS. open `index.html` in a browser and the
whole site works — except the chatroom and guestbook, which need five
minutes of setup first (below), because they're real: other visitors'
messages actually show up, not a static mockup of them.

there's also a real, password-protected `/admin` — see
["the back office"](#the-back-office-admin) below — for writing
articles, checking webring "request a spot" pitches, and uploading or
deleting movie night's screenings, without hand-editing HTML or
opening the Supabase dashboard. that part *does* need one specific
host (Cloudflare) and a small server-side dependency; the public
pages stay portable to any static host regardless.

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
   - if you're also setting up **the back office** (below), run
     [`supabase/002_articles_movies.sql`](supabase/002_articles_movies.sql)
     next (same New query → paste → Run) — it adds the `articles` and
     `movies` tables `/admin` manages. optionally follow it with
     [`supabase/003_seed_content.sql`](supabase/003_seed_content.sql),
     which loads the site's original 5 articles and 2 movies as real
     rows instead of starting the dashboard from empty.
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

## the back office (/admin)

`/admin` is a real login-gated dashboard: write and edit articles (they
render at `article.html?slug=...`, replacing what used to be 5 separate
hand-written files under `articles/`), read and dismiss webring "request
a spot" pitches (`site_submissions` — previously only visible in the
Supabase Table Editor), and add, reorder, or delete movie night's
screenings, including the video file itself. a screening's video can
either be uploaded (the usual case) or just linked to a direct file URL
hosted somewhere else — either way, pasting an IMDb link into the movie
form fills in title/year/rating/director/writer/stars/synopsis/poster
for you (via [OMDb](https://omdbapi.com), see the secrets table below).
deleting a screening also deletes its files from R2, which is the whole
point for uploaded video: the free tier caps out at
10GB, and the dashboard shows you how close you are before every
upload.

this needs real server code — checking a password, writing to Supabase
with a key that must never reach the browser, signing upload URLs — so
unlike the rest of the site, it only works on **Cloudflare** specifically
(not Neocities/GitHub Pages/Netlify/Vercel, which only serve files).
the public pages still work anywhere; `/admin` just won't exist
anywhere else.

concretely, this deploys as a **Cloudflare Worker with static assets**
— Cloudflare's current default for a new GitHub-connected project (the
older separate "Pages" product still exists for projects already on
it, but new ones go through a unified "Workers" flow now). `wrangler.jsonc`
at the repo root already has the config committed — the whole repo
root serves as static files, and only `/api/admin/*` requests reach
`worker/index.js`, the small router in front of `functions/api/admin/**`'s
actual endpoint logic.

### one-time setup

1. **find your R2 bucket.** you already have one if `movie-night.html`
   is showing real screenings — its videos load from a
   `pub-<hash>.r2.dev` URL, and that URL's bucket is the one to use.
   Cloudflare dashboard → R2 → note the bucket's exact name (already
   wired into `wrangler.jsonc` as `bitcafe-media` — update that file if
   yours is named differently).
2. **create an R2 API token.** R2 → *Manage API Tokens* → create one
   scoped to just that bucket, permission "Object Read & Write". note
   the **Access Key ID**, **Secret Access Key**, and your **Account
   ID** (shown on the same page/the R2 overview) — this is what lets a
   Function sign a presigned upload URL; it's unrelated to (and much
   narrower than) your global Cloudflare API key.
3. **create the Worker project.** Cloudflare dashboard → *Workers &
   Pages* → *Create* → connect this GitHub repo → set the production
   branch to whichever branch actually has this code (`admin-backend`
   until it's merged to `main`) → build command *blank* → deploy
   command `npx wrangler deploy` (Cloudflare should prefill this once
   it sees `wrangler.jsonc`). this deploys the repo to its own
   `<project>.workers.dev` URL, separate from wherever the public site
   is deployed today — nothing about your existing deploy changes yet.
   the R2 bucket binding doesn't need a manual dashboard step; it's
   already declared in `wrangler.jsonc`.
4. **set the secrets.** project → *Settings* → *Variables and Secrets*
   (or `npx wrangler secret put NAME` from a terminal with `wrangler
   login` run first):

   | name | value |
   |---|---|
   | `ADMIN_PASSWORD` | whatever you'll type in at `/admin` — pick something long, this is the only thing standing between the internet and your delete buttons |
   | `SESSION_SECRET` | a long random string (`openssl rand -base64 32` works) — also doubles as the key for the password check itself |
   | `SUPABASE_URL` | same value as `js/supabase-config.js`'s `url` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → *Project settings → API* → **service_role** key. **not** the anon key — this one bypasses row-level security entirely and must never end up in client-side code |
   | `R2_ACCOUNT_ID` | from step 2 |
   | `R2_ACCESS_KEY_ID` | from step 2 |
   | `R2_SECRET_ACCESS_KEY` | from step 2 |
   | `R2_BUCKET_NAME` | from step 1 |
   | `R2_PUBLIC_BASE_URL` | the `https://pub-<hash>.r2.dev` origin your bucket already serves from (everything before the filename in the video URLs on `movie-night.html` today) |
   | `OMDB_API_KEY` | optional — powers the "fill in from IMDb" button on the movie form. free at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) (1,000 requests/day). skip it and that button just shows an error; everything else in `/admin` works without it |

5. **run the database migrations** — see "connecting the till" above
   (`002_articles_movies.sql`, then optionally `003_seed_content.sql`).
6. visit `https://<project>.<your-subdomain>.workers.dev/admin/`, log
   in with `ADMIN_PASSWORD`, and confirm you can see the
   articles/movies/wall requests tabs.

losing `SESSION_SECRET` (or deliberately rotating it) instantly logs
everyone out — that's the "kill switch" if you ever suspect a session
leaked. changing `ADMIN_PASSWORD` takes effect on the next login
attempt; existing sessions stay valid until they expire (14 days) or
`SESSION_SECRET` rotates.

once this branch is merged to `main` and you're happy with it on the
`.workers.dev` URL, point your domain at this Worker instead of
wherever the public site deploys today, then turn the old host off —
see `worker/index.js` for the router and `functions/` for the actual
backend code (`_lib/` has the shared session/Supabase/R2 helpers,
`api/admin/` has one file per endpoint) if you want to read how it
works before trusting it with your storage bill.

## deploying

the public pages are still static files — any static host works for
*those*:

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

**`/admin` is the one exception** — it only runs on Cloudflare (see
"the back office" above). if you deploy the public pages somewhere
else, `/admin` and `article.html`/`movie-night.html`'s admin-managed
content still work fine (they just read Supabase directly, same as
chat/guestbook/notices) — you'd only lose the login-gated dashboard
itself, and would go back to editing rows in the Supabase Table Editor
and uploading to R2 by hand.

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
index.html             front counter / homepage
articles.html          the reading menu (article index, admin-managed)
article.html            single-article template, reads ?slug=... from Supabase
coffee.html             order digital coffee; spends real bits (see below),
                        animated pixel cup, exportable as .jpg / .gif
fishing.html            gone fishin': cast, reel in, take the fish; pays
                        out bits, spendable on coffee
chat.html               live chatroom (needs Supabase, see above)
guestbook.html          guestbook (needs Supabase, see above)
links.html              webring: featured sites, an 88x31 button wall,
                        a random-link door, and a "request a spot" form
notices.html            the notice board: pinned updates + visitor pins
movie-night.html        video screenings (admin-managed), linked from the notice board
404.html                not-found page
_redirects              301s the 5 old articles/*.html URLs to article.html?slug=...
css/style.css           the whole design system, one file (includes /admin's styles)
js/common.js            clock, print-reveal effect, ticket numbers, the
                        shared bits balance + coin-purse rendering
js/chat.js              chatroom logic (Supabase Postgres + realtime)
js/guestbook.js         guestbook logic (Supabase Postgres + realtime)
js/webring.js           random-link door + site-submission form (Supabase)
js/notices.js           notice board logic (Supabase Postgres + realtime)
js/articles.js          reading menu list + single-article rendering (Supabase)
js/movie-night.js       screening list rendering + video player controls
js/coffee.js            the coffee-ordering toy; checks and spends bits
js/pixel-cup.js         the pixel-art cup renderer + jpg/gif export
js/fishing.js           the fishing game's state machine + catch table
js/supabase-config.js   your database keys go here
supabase/schema.sql               original tables: chat, guestbook, notices, site_submissions
supabase/002_articles_movies.sql  adds the articles/movies tables /admin manages
supabase/003_seed_content.sql     optional: loads the original 5 articles + 2 movies as rows
admin/index.html        the /admin login page
admin/dashboard.html    the back office: articles / wall requests / movie night tabs
admin/js/*.js           dashboard logic, one file per tab + shared auth helpers
wrangler.jsonc          Cloudflare Worker config: static assets + the R2 binding
                        (see "the back office" above for how this gets deployed)
.assetsignore           keeps functions/, worker/, node_modules/, etc. out of the
                        public static-asset upload (gitignore-style syntax)
worker/index.js         the Worker's entry point: routes /api/admin/* to the
                        right functions/api/admin/** handler, everything else
                        falls through to being served as a static file
functions/_lib/*.js     shared backend helpers: sessions, Supabase REST, R2
functions/api/admin/**  the /admin backend's actual endpoint logic, one file
                        per route (dispatched by worker/index.js, above)
package.json            two dependencies: aws4fetch (R2 presigning) and wrangler
                        (deploys the Worker) — the public site still has no
                        build step of its own
img/badges/*.svg        hand-made 88x31 tribute badges for the button wall
img/fishing/*.png       fishing sprites/background, from two free
                        itch.io pixel-art packs (see fishing.html's
                        footer and media/ for the originals/licenses)
PRODUCT.md              product brief this site was built from
DESIGN.md               the visual system this site was built to
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

the five seeded articles (`supabase/003_seed_content.sql`) are original
placeholder writing — edit or delete them from `/admin` whenever you're
ready, no file-editing or redeploy needed anymore. the "fletcher"
persona, the coffee menu, and the webring picks are yours to keep,
rename, or replace outright.
