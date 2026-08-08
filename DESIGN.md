---
name: bit cafe
description: A running register-tape ritual — every room in the café is something you order, and it prints.
colors:
  paper: "#eef1e5"
  paper-recessed: "#e4e8d7"
  page-ground: "#e6ead9"
  greenbar-stripe: "#cfe0c6"
  ink: "#201f19"
  ink-soft: "#4b4a3f"
  ink-faint: "#5f5d4b"
  ink-line: "#b9bba4"
  duplicate-ribbon-red: "#b31f28"
  red-dim: "#8c1920"
  rubber-stamp-teal: "#106b5c"
  teal-dim: "#0b4f44"
typography:
  display:
    fontFamily: "Martian Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Courier Prime, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Martian Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.72rem"
    fontWeight: 600
    letterSpacing: "0.06em"
rounded:
  none: "0px"
  circle: "50%"
  stamp: "46% 54% 51% 49% / 53% 47% 53% 47%"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1.125rem"
  space-5: "1.75rem"
  space-6: "2.5rem"
  space-7: "3.75rem"
  space-8: "5.5rem"
components:
  button-primary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
  button-accent:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.duplicate-ribbon-red}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
  button-accent-hover:
    backgroundColor: "{colors.duplicate-ribbon-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.4em"
  input-text:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.75em 0.85em"
---

# Design System: bit cafe

## Overview

**Creative North Star: "The All-Night Order Counter"**

bit cafe reads as a running register tape, not a hacker terminal and not a cozy artisanal coffee brand — the two ruts the category defaults to. Every room in the site (articles, coffee, chatroom, guestbook, webring) is framed as something you order at a counter, and the counter's own materials (thermal receipt paper, dot-matrix print, carbon-duplicate ink, rubber ink stamps, torn perforation) are the *entire* visual vocabulary. There is no photography, no gradient, no glassmorphism, no rounded card shell standing in for content — the paper and the ink are the content's container.

The palette stays a single committed light world: pale, cool, faintly green dot-matrix "greenbar" continuous-feed paper as the ground, near-black ink for reading text, and two accent inks — duplicate-ribbon red and rubber-stamp teal — that behave like a two-color till ribbon, never like decoration scattered for variety. A dark mode was deliberately not built: paper and ink don't have a night mode in life, and forcing one would break the object's own logic.

**Key Characteristics:**
- One paper world, cool and pale, never warm cream or ivory — this is bond/thermal stock, not stationery.
- Two accent inks only (red, teal), each with a specific job, never interchangeable.
- Zero border-radius except where the object itself is round (a status LED, an ink stamp).
- Ornament is always a print artifact — torn edges, perforation, barcode, stamp — never a gradient, glow, or bevel.
- Monospace everywhere, in two registers: a display face for chrome/numerals, a body face for sustained reading.

## Colors

The palette reads as thermal receipt paper and its two inks: everything else is a tint or a line weight, never a third hue.

### Primary
- **Duplicate-Ribbon Red** (`#b31f28`): the till's red ribbon. Used for primary CTAs, live/active states, prices, the "OPEN" status LED, and the pull-quote/stamp accents on articles. Never used for body text at length.

### Secondary
- **Rubber-Stamp Teal** (`#106b5c`): the second ink in the till, reserved for confirmation and secondary-action moments — "paid" stamps, secondary buttons, chat handles, guestbook accent stamps. Keeps red singular as the "act now" color.

### Neutral
- **Paper** (`#eef1e5`): the base surface every ticket/card sits on.
- **Paper Recessed** (`#e4e8d7`): stacked/secondary surfaces — the "about" ticket, disabled-field fill, drink-menu default state.
- **Page Ground** (`#e6ead9`): the body background beneath every ticket, overlaid with the greenbar stripe.
- **Greenbar Stripe** (`#cfe0c6`, applied at ~55% opacity as a 16px repeating horizontal band): the continuous-feed computer-paper texture that is the page's signature material reference. Deliberately faint — it is texture, not a foreground pattern.
- **Ink** (`#201f19`): primary reading text, headings, borders.
- **Ink Soft** (`#4b4a3f`): secondary reading text (subheads, descriptions, nav-adjacent copy).
- **Ink Faint** (`#5f5d4b`): tertiary/meta text — ticket numbers, timestamps, footer fine print, byline fragments. Darkened once already (from `#82806c`) after a finish review found the lighter value failed 4.5:1 contrast on both paper tones; current value holds ~5.3–5.8:1.
- **Ink Line** (`#b9bba4`): hairlines, dashed dividers, perforation, disabled-field borders. Never used for text.

### Named Rules
**The Two-Ink Rule.** Only red and teal ever carry color. If a third hue is needed for a new component, the system has been misapplied — reach for weight, size, or the existing inks first.

**The No-Warm-Paper Rule.** The paper ground stays cool and pale (green-gray undertone). It never shifts toward cream, ivory, or warm parchment — that would read as bookish stationery, not register/dot-matrix stock, and would break the OWN-WORLD's specific material claim.

## Typography

**Display Font:** Martian Mono (with `ui-monospace, SFMono-Regular, Menlo, monospace`)
**Body Font:** Courier Prime (with the same monospace fallback stack)

**Character:** Martian Mono is a dot-matrix/LED-descended display mono, used wherever the site is acting as *chrome* — logo, nav, ticket headers, numerals, buttons, labels. Courier Prime is a true typewriter revival, used wherever the site is acting as *prose* — article bodies, ticket descriptions, footer copy. The pairing mirrors a real till: a stenciled panel face for the machine's own labels, a typewriter face for what a human typed into it.

### Hierarchy
- **Display** (800, `clamp(1.4rem, 1.1rem + 1.2vw, 2rem)` at the brand mark; article `h1` scales to `clamp(1.5rem, 1.15rem + 1.4vw, 2.15rem)`, `line-height: 1.1`): page/brand identity and article titles.
- **Headline** (800, ~1.05–1.15rem, Martian Mono): card and section headings (`h3`, `.specials-heading`).
- **Body** (400, 1rem/16px, Courier Prime, `line-height: 1.55`, measure capped at 68ch via `--measure`): sustained reading copy — article paragraphs, descriptions.
- **Label** (600, 0.65–0.85rem, Martian Mono, `letter-spacing: 0.05–0.08em`, uppercase): nav items, buttons, form labels, ticket-head meta, stamps.

### Named Rules
**The Chrome/Prose Split Rule.** Martian Mono never carries a full sentence of reading prose; Courier Prime never labels a control. Mixing the two inside one text run is the tell that a component was assembled instead of designed for this system.

## Layout

Multi-page architecture (confirmed product decision, not a device): each room (`index.html`, `articles.html`, `chat.html`, `coffee.html`, `guestbook.html`, `links.html`) is its own document, linked by a persistent masthead nav rather than a single scrolling page. Content sits in a `max-width: 78rem` (`--page-max`) wrap, centered, with `0 1.75rem` side padding that narrows to `0 1.125rem` under 640px. Article/ticket content narrows further to a readable measure (`54rem` for article tickets, `68ch` for paragraph text). Spacing runs on an 8-step scale (`--space-1` `0.25rem` through `--space-8` `5.5rem`); the rule that holds throughout is more space above a heading than below it, and generous (`--space-7`–`--space-8`) separation between page sections versus tight (`--space-2`–`--space-3`) spacing within a single ticket's own header block. Two-column grids (today's specials, article prev/next) collapse to one column under 640px.

## Elevation & Depth

Flat by default, lifted only where a ticket physically sits above the page ground — depth is soft and photographic (a sheet of paper with light falling on it), never a hard offset block. There is no tonal-layering system beyond the paper/paper-recessed pair; elevation is shadow-only.

### Shadow Vocabulary
- **shadow-1** (`0 1px 2px rgba(32,31,25,.10)`): resting buttons and small controls — barely-there contact shadow.
- **shadow-2** (`0 8px 20px rgba(32,31,25,.16), 0 2px 6px rgba(32,31,25,.10)`): every `.ticket` — the paper-lifted-off-the-counter shadow, the system's primary depth statement.

### Named Rules
**The Soft-Lift Rule.** Every shadow in the system carries a blur and a positive offset (paper catching light), never a hard `4px 4px 0` block — this world is receipt paper, not a neobrutalist poster, and earns no exception to that.

## Shapes

Square by invariant: `border-radius: 0` on every ticket, card, button, input, and nav element — paper and printed chrome don't have rounded corners. The only two exceptions are things that are actually round in life: the status LED dot (`rounded.circle`, `50%`) and the ink-stamp badges (`rounded.stamp`, an asymmetric `46% 54% 51% 49% / 53% 47% 53% 47%` blob, rotated ±7–8° and run through an SVG `feTurbulence`/`feDisplacementMap` filter, `#inkbleed`, so the edge distorts like real rubber-stamp ink bleed rather than rendering as a clean vector oval). Ticket edges use two print-specific devices instead of borders: a torn top edge (`.ticket-torn`, a layered 45°/-135° gradient tiled at 18px to fake a hand-torn perforation silhouette) and dashed/dotted perforation rules (`.tearline`, `.ticket-perf-bottom`, a repeating-linear or repeating-radial gradient standing in for a die-cut tear line). Both are drawn in CSS, not raster.

## Components

### Buttons
- **Shape:** square, 2px solid border, no radius.
- **Primary (neutral):** `{colors.paper}` background / `{colors.ink}` border+text at rest; inverts to `{colors.ink}` fill / `{colors.paper}` text on hover — a physical key-press read, not a color-opacity fade.
- **Accent (red):** same mechanic with `{colors.duplicate-ribbon-red}` as the border/text/hover-fill color; reserved for the primary action on a page (order, sign, brew).
- **Teal variant:** same mechanic with `{colors.rubber-stamp-teal}`; used for secondary/confirming actions ("read the zine").
- **Active:** `translateY(2px)` and the resting shadow drops away — a tactile "pressed" read.
- **Disabled:** 45% opacity, `cursor: not-allowed`, hover state suppressed.

### Cards / Containers ("Ticket")
- **Corner Style:** square (`rounded.none`).
- **Background:** `{colors.paper}` (primary) or `{colors.paper-recessed}` (secondary/nested, e.g. the proprietor bio card).
- **Shadow Strategy:** `shadow-2`, see Elevation & Depth.
- **Border:** none — the shadow and the torn/perforated edge devices do the framing work a border would otherwise do.
- **Internal Padding:** `space-6` top/sides, `space-5` bottom; `space-5`/`space-4` on mobile.
- **Signature sub-pattern — Ticket Head:** every ticket opens with a small-caps label row (left) and a meta value (right, e.g. a ticket number or record count), separated from the body by a 1px dashed rule. This device repeats identically across all six rooms and is the single strongest carrier of the FORM promise — see Do's and Don'ts.

### Inputs / Fields
- **Style:** `{colors.paper}` background, 2px solid `{colors.ink}` border, square corners, Courier Prime text.
- **Focus:** 3px solid red outline, 1px offset — deliberately loud, not a soft glow.
- **Disabled:** `{colors.paper-recessed}` fill, `{colors.ink-faint}` text, `{colors.ink-line}` border, `not-allowed` cursor.
- **Labels:** always the Label type role — small, uppercase, Martian Mono — sitting above the field, never inside it as a placeholder-only label.

### Navigation
- Martian Mono, uppercase, 0.85rem, `letter-spacing: 0.03em`. Rest state uses `{colors.ink-soft}`; hover and the current-page item both use `{colors.duplicate-ribbon-red}`/`{colors.ink}` with a 2px underline. The current item additionally gets a `» ` prefix glyph (a typeset guillemet, not an icon) — the same prefix the site uses for breadcrumb-style "back" links, so it reads as one consistent "you are here" mark rather than a one-off.

### Stamp (signature component)
A rotated, asymmetric-radius badge run through the `#inkbleed` SVG filter, in either red or teal ink, used for state/status marks that a real till would rubber-stamp: FRESH, NEW, PAID*, OPEN, fresh-ink/signed on guestbook entries. This is the system's one permitted "icon-like" device, and it is explicitly not a glyph-icon substitute — it is a drawn, textured, world-native object standing in for itself, not for something else.

### Pixel Cup (signature component)
A hand-mapped 28×28 sprite (`canvas`, 6px cells, `image-rendering: pixelated`) used on `coffee.html`: ink outline, paper interior, red fill rising row-by-row as the order brews, teal never appears here (fill has exactly one meaning — "drink level" — and only one ink carries it). Steam is a tiny particle system quantized to the same grid, not a smooth CSS animation, so it stays true to the sprite rather than becoming a vector flourish bolted onto pixel art. The cup persists on screen from the moment brewing starts through the finished receipt, and the same renderer (in an offscreen instance, never the live one) backs the "save as .jpg" / "save as .gif" export pair. This is the one component allowed a raster technique (`canvas`) instead of CSS/SVG, because the brief specifically called for pixel art and an exportable image — both are canvas-native needs, not a substitution for something CSS could do as well.

### Button Wall (signature component)
A wrapped row of hand-authored 88×31 badges (`links.html`, plus a 4-up teaser on the homepage), each built from the same template as the site's own outbound badge: a dark Martian Mono title bar, a Courier Prime tagline, a status dot alternating red/teal for rhythm. These are tribute badges bit cafe made itself for sites it links to — never a scraped or re-hosted copy of another site's actual button art. A "wander somewhere random" control sits beside the wall and opens a random pick from the same linked-site pool in a new tab; treat it as part of this component, not a separate button style.

## Do's and Don'ts

### Do:
- **Do** keep every accent to the two-ink system (red, teal) — a new color for a new feature is a system violation, not an extension.
- **Do** use the Ticket Head device (label + meta, dashed rule beneath) as the opening of any new page-level card; it's what makes a new room legible as "still bit cafe" at a glance.
- **Do** render any new badge/status device as a rotated, `#inkbleed`-filtered stamp shape rather than a flat tag or pill.
- **Do** keep shadows soft-blurred with a positive offset (`shadow-1`/`shadow-2`); a new elevation need should extend that pair, not introduce a hard block shadow.

### Don't:
- **Don't** re-host or trace another site's actual logo, badge, or button art. The button wall's badges are bit cafe's own tribute designs in the house palette — real enough to credit the site by name and link there for real, never a copy of assets we don't have rights to.
- **Don't** reach for `canvas` by default. The pixel cup is the one exception, justified by two concrete needs (true pixel-grid rendering, image/GIF export) that CSS/SVG can't satisfy — not a precedent for redoing other components in canvas.
- **Don't** put a small-caps label directly above a single headline as a stand-alone kicker/eyebrow. A finish review caught this exact pattern on the homepage's "today's special" cards (a `.ticket-head` label sitting immediately above one `h3`); the fix replaced it with one shared section heading over the whole card grid plus a corner-positioned stamp. The Ticket Head device stays reserved for headers that sit above a list, a form, or a bio block — never above one single headline doing the same job twice.
- **Don't** warm the paper toward cream/ivory, or swap Courier Prime/Martian Mono for a serif — both would pull the system toward generic "bookish nostalgia" instead of the specific dot-matrix/thermal-till world it commits to.
- **Don't** use a Unicode emoji or pictograph as a stand-in icon (the homepage avatar placeholder originally used `◐` for "no photo on file" and was replaced with an authored SVG dot-matrix noise grid for exactly this reason). Draw new icon-like marks as SVG in the system's own grammar (stamp, barcode, LED dot), never borrow a platform glyph.
- **Don't** round a corner anywhere except the two invariant exceptions (LED dot, stamp blob). A new component that reaches for `border-radius` on a card, button, or input has left the system.
