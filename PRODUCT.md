# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain static HTML/CSS/JS, no build step. Deployable to any static host (Neocities, GitHub Pages, Netlify drop, etc.). Confirmed directly by the user over the framework alternative.

## Users

People nostalgic for (or curious about) the pre-corporate indie web — GeoCities/Neocities/webring/personal-homepage culture. They come to bit cafe to read short zine-style articles, "order" whimsical digital coffee, hang out and talk live with other visitors in a retro chatroom, and sign a guestbook on their way out. Casual, browsing, no task to complete — a hangout, not a tool.

## Product Purpose

bit cafe is a themed indie personal website — a virtual internet cafe that gives old web culture a living home again. It exists to be hung out in, not converted on: read, chat, laugh at the coffee menu, leave your mark in the guestbook, wander the webring out to other indie sites.

## Positioning

Unlike cozy-coffee-shop SaaS landing pages or corporate blogs that borrow retro/indie aesthetics as decoration, bit cafe is a genuinely personally-authored slice of old web culture with real functioning multi-user chat — a living hangout, not a portfolio piece cosplaying one.

## Operating Context

Visitors arrive via direct link or webring, browse several standalone HTML pages (home, articles, chatroom, order coffee, guestbook, links/webring), read, chat, may return later. The site is static with no custom server; real-time chat and the guestbook need an external always-on backend, so both are planned to run on a free-tier hosted realtime service (Supabase — Postgres plus realtime subscriptions, client library loaded via CDN, client-side only) — the user must create their own free Supabase project, run the provided SQL schema, and paste config keys in before chat/guestbook go live on a real deploy. Until keys are supplied, those features degrade to a clear "not connected yet" state rather than silently failing.

## Capabilities and Constraints

- Multi-page architecture (confirmed): separate HTML files per section, not a single scrolling page.
- Chatroom is real, live, multi-user chat (confirmed) — not a static mockup — via a hosted realtime backend since there is no custom server.
- Guestbook likewise persists across visitors via the same backend.
- No user accounts or auth: chat/guestbook use freeform nicknames only. This is an explicit, disclosed limitation of a hobby project — no login, no moderation backend, no profanity filter. User-submitted content is still rendered XSS-safely (escaped/text-only) as a baseline safety measure, but there is no content moderation system.
- "Order digital coffee" is a joke ordering flow with a silly menu and a fake "receipt"/brew animation: no real coffee is brewed or shipped, and no real-world money changes hands. It does spend a real (if house-invented) balance — "bits," earned by playing the fishing minigame (`fishing.html`) and tracked client-side — so the transaction itself is honest even though the product isn't.
- `fishing.html`: a small, forgiving three-step minigame (cast, reel in, take the fish) with no skill gate and no levels; every attempt pays out at least one bit. Bits are shared across the site (localStorage), shown in a coin-purse next to the "open" sign on every page, and are the only way to earn spending power for the coffee counter — everyone starts with 10.
- Articles are original placeholder content authored in-house in the site persona's voice (confirmed) — the user did not supply real copy; content is swappable later.
- No real logo/brand assets supplied; typographic/graphic identity is authored as part of design.

## Brand Commitments

- Site name: "bit cafe" (stylized lowercase, always).
- Aesthetic touchstones the user named explicitly as cultural/vibe evidence (not to be copied pixel-for-pixel): melonking.net, ribo.zone, lostletters.neocities.org — GeoCities/Neocities/personal-homepage/webring-era indie web. Explicitly NOT corporate, NOT high-end modern SaaS polish.
- Execution register: cohesive retro (confirmed) — fully committed period aesthetic that stays internally consistent and legible, closer to ribo.zone's intentional lo-fi than melonking.net's maximalist chaos.
- Structure: multi-page, separate HTML pages per section (confirmed), like a classic personal site rather than a modern one-pager.
- Invented host/sysop persona (confirmed) authors the articles and guestbook welcome in a consistent voice; named and voiced during design.

## Evidence on Hand

- No real articles or copy provided — placeholder articles to be written in-house, in-persona, swappable later.
- No logo or brand assets provided.
- No live backend credentials provided — user supplies their own free-tier Supabase (or equivalent) project keys after build to bring chat/guestbook fully online on a real deploy.

## Product Principles

1. Real over cosplay — where the brief calls for something real (live multi-user chat), build it for real rather than faking functionality behind a static prop.
2. Cohesive nostalgia, not chaos for its own sake — every retro device earns its place and stays legible and usable.
3. No corporate polish — reject SaaS-default gradients, glassmorphism, generic hero patterns; favor era-authentic materials, textures, and honest imperfection instead.
4. Multi-page wandering over single-page scrolling — visitors move between "rooms," like an old personal site, not a single marketing scroll.
5. Static-first, backend-light — the whole site stays a static deploy plus one thin, free-tier realtime service; no custom server to run or maintain.

## Accessibility & Inclusion

No explicit standard requested. Still built to be keyboard-navigable with real semantic HTML/links under the retro skin, real alt text on imagery, and legible contrast even within era-authentic color choices — retro is a skin, not an excuse for illegibility.
