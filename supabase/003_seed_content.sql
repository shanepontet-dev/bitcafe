-- bit cafe: seed content for the /admin backend
-- -----------------------------------------------------------------
-- run this once in the Supabase SQL editor, AFTER 002_articles_movies.sql.
-- inserts the 5 original placeholder articles and the 2 movies
-- already sitting in R2 as real rows, so /admin has something to show
-- (and something to edit/delete) from the first login instead of an
-- empty dashboard. generated from the site's original hand-written
-- HTML -- see git history before this admin backend existed if you
-- want the byte-for-byte original static pages.
--
-- this is a one-time migration, not something to re-run: articles.slug
-- is unique, so running it twice will fail on the second pass rather
-- than duplicate rows.

insert into articles (slug, title, dek, byline, body_html, pull_quote, pull_cite, read_minutes, published, sort_order, created_at) values (
  'dial-up-eulogy',
  'an autopsy of the modem handshake',
  'on the noise that used to mean something was about to happen',
  'dot_matrix',
  '<p>It went, roughly: a dial tone, a string of DTMF beeps like someone stabbing a phone in a panic, then a pause just long enough to make you doubt yourself, and then the screech. Not one screech: three, maybe four, layered and fighting, a fax machine arguing with a theremin. Somewhere in the middle of that noise, two computers that had never met were agreeing on a language. You could not do anything useful during it. That was, it turns out, the point.</p>
<p>I want to be careful not to write the version of this essay where the noise was secretly beautiful all along, some misunderstood aria we were too impatient to appreciate. It was an ugly sound. It was also the only sound in the house that meant something was about to happen, not had happened, not was happening, but was about to, in a way you could physically feel building. You don''t get that anymore. Things simply arrive now, pre-loaded, no overture.</p>
<p>Here is what the handshake was actually doing, mechanically, for anyone who wants the unromantic version: two modems negotiating the fastest connection speed they could both sustain over a line built for voices, not data, exchanging test tones to measure the noise floor, agreeing on a modulation scheme, and then, finally, opening a channel. It was a negotiation in the truest sense. Neither side got to dictate terms. The connection you ended up with was always a compromise between what you wanted and what the copper in the wall between you and the exchange was willing to carry.</p>
<p>That''s the part I miss, if I''m honest, more than the sound itself. Not the screech, the negotiation. Every connection had to be earned, however slightly, however automated the earning was. You couldn''t pretend the network wasn''t there, because you''d just spent forty-five seconds listening to it introduce itself.</p>
<p>Somewhere around the third or fourth broadband upgrade, the network went quiet and stayed quiet, which is obviously better, and also is the reason nobody under thirty flinches when I do a bad impression of the handshake at a party. It doesn''t mean anything to them. It''s just a weird noise a stranger is making with their mouth. Which, honestly, tracks; that''s about all it ever was. A weird noise that happened to be doing something.</p>
<p>bit cafe doesn''t run over a phone line and I''m not going to pretend it does. But there''s a splash screen on this site''s chatroom that takes about a second longer than it strictly needs to, on purpose, because a connection with zero ceremony doesn''t feel like arriving anywhere. It just feels like it was always open. I''d rather you felt the door.</p>',
  'the whole ritual only worked because it made you wait in a way that had weight to it: not the dead weight of a spinner, but the kind of wait that has a shape',
  'dot_matrix, somewhere around 2am',
  6,
  true,
  0,
  '2026-07-02T12:00:00Z'::timestamptz
);

insert into articles (slug, title, dek, byline, body_html, pull_quote, pull_cite, read_minutes, published, sort_order, created_at) values (
  'webring-witness',
  'the webring is not dead, it is just resting',
  'a small defense of the prev / next / random link at the bottom of a page',
  'dot_matrix',
  '<p>If you never used one: a webring was a loop of independent sites, usually about one shared subject or one shared vibe, linked to each other with a little widget at the bottom of the page: a "prev," a "next," sometimes a "random," occasionally a member list that scrolled forever. You''d land on someone''s page about lighthouses or Sailor Moon or their cat''s medical history, hit "next," and get catapulted to a total stranger''s page about a completely different subject, held together only by the fact that both of them had opted into the same ring on purpose.</p>
<p>No ranking. No relevance score. No engagement optimization deciding you''d probably rather see something else. Just: this person thought you, specifically, having found your way here, might like to see what their neighbor built too.</p>
<p>That''s the part I keep coming back to when people ask why bit cafe bothers having a links page at all when search exists, when everything is theoretically one query away. Search finds you the thing you already knew to ask for. A webring hands you the thing you didn''t know existed, vouched for by someone with nothing to gain from the click. Those are not the same kind of finding, and I don''t think we''ve built a good replacement for the second kind; we mostly just stopped doing it, and called the absence progress.</p>
<p>I''ll cop to the obvious counterpoint: rings could be terrible. Half the members eventually 404''d. The "random" button had a way of landing on the same three sites. And there was a real, unfixable awkwardness in linking your work next to someone else''s without knowing if theirs would still be there in a year. Rings were fragile the way anything made by volunteers with no budget is fragile. That fragility was also, weirdly, part of what made them feel honest: nobody was pretending this was a permanent, professionally maintained index of the internet. It was a bunch of people, holding hands across servers, hoping the chain held.</p>
<p>bit cafe''s <a href="links.html">webring page</a> isn''t a formal ring: I haven''t found one worth joining yet that isn''t a ghost town or a parody of itself, and I''d rather be honest about that than fake a membership badge. What''s there instead is closer to the spirit: real sites I actually visit, credited as the reason this place looks the way it does, linked out generously with nothing tracked and nothing sold. If that''s not technically a webring, it''s at least fluent in the same language. Consider it resting, not dead. I''d like to think it''s just waiting for enough of us to want it back.</p>',
  'a feed guesses what you want next. a webring just introduces you to a neighbor and gets out of the way.',
  'dot_matrix',
  7,
  true,
  1,
  '2026-07-18T12:00:00Z'::timestamptz
);

insert into articles (slug, title, dek, byline, body_html, pull_quote, pull_cite, read_minutes, published, sort_order, created_at) values (
  'ascii-vs-emoji',
  'ascii vs. emoji: a border skirmish',
  'two ways of drawing a smile, forty years apart, still arguing',
  'dot_matrix',
  '<p>Somebody typed <code>:-)</code> into a Carnegie Mellon bulletin board in 1982 to mark a joke post as a joke, and the rest of us have been drawing faces out of punctuation ever since, with varying levels of commitment. There''s a whole taxonomy if you go looking: the shrug, built out of a table flip''s calmer cousin; the elaborate multi-line cat that took someone real patience to align in a monospace font; the wall of forward slashes standing in for hair, for wings, for an explosion, for whatever the artist needed a wall of forward slashes to mean that day.</p>
<p>Then emoji showed up, official, standardized, rendered identically-ish across a billion devices, and something changed in what it means to put a face at the end of a sentence. You no longer have to build the joke. You select it from a drawer. 😊 arrives fully formed, no assembly, no dependence on your font rendering correctly on the other end, which, if you ever sent someone painstaking ASCII art only to have their client wrap the lines and turn your dragon into abstract confetti, is not a small mercy.</p>
<p>I don''t actually think this is a fight with a winner, whatever the headline promised. What I think happened is that we split one job into two smaller ones. ASCII art was never really about efficiency: it was slow on purpose, a little showoff-y on purpose, a way of proving you''d spent real minutes on a message that could have been four words. Emoji optimized that away entirely, and in exchange gave everyone, not just the people willing to count spaces, a way to land a tone instantly, across languages, without needing to explain the bit.</p>
<p>What we lost is harder to name than "effort," though effort''s part of it. It''s closer to signature. A hand-built ascii face has a maker behind it in a way a Unicode codepoint structurally can''t; you can tell two people''s <code>(╯°□°)╯︵ ┻━┻</code> apart if you look, the spacing, the choice of table-flip target, the little flourishes. Nobody''s emoji looks like theirs. That''s the tradeoff, in full: universal legibility for the loss of a fingerprint.</p>
<p>This site leans ascii where it can get away with it, you''ll see it in the odd loading state, the odd flourish, not out of purism, just because a place that''s trying to feel handmade should occasionally show its hand. Feel free to laugh at the effort. That was always half the point.</p>',
  'ascii made you the artist. emoji made you the translator. both jobs are just: try to get a feeling across a wire that was never built to carry feelings.',
  'dot_matrix',
  5,
  true,
  2,
  '2026-07-29T12:00:00Z'::timestamptz
);

insert into articles (slug, title, dek, byline, body_html, pull_quote, pull_cite, read_minutes, published, sort_order, created_at) values (
  'graveyard-shift',
  'graveyard shift: notes from an empty chatroom at 3am',
  'on the particular quiet of a room with three people in it, all pretending to type',
  'dot_matrix',
  '<p>There are three of us in the room right now, by the count in the corner, and I haven''t seen a message in eleven minutes. Nobody''s left. The count would drop if they had. We''re just... here. Present tense, no output. I used to think that was a failure state for a chatroom, the thing you''d fix if you could, and I''ve come around on it entirely: this is the whole appeal, and I didn''t understand that until I started keeping this kind of hour on purpose.</p>
<p>A busy chatroom at 3pm is a performance. Everyone''s typing for an audience, even a small one, even an audience of two. A near-empty chatroom at 3am is something else: it''s closer to sitting in a room with a stranger who also couldn''t sleep, both of you pretending to read, neither of you actually turning pages. The silence isn''t absence. It''s a specific kind of company that doesn''t ask anything of you.</p>
<p>Somebody types eventually: usually something small. A link. A complaint about a browser tab count that''s gotten out of hand. Once, memorably, someone just posted the word "raccoon" with no context and logged off, and the two of us left spent a genuinely absurd amount of time trying to reconstruct what had happened to them that night. We never found out. That''s fine. Not every thread needs resolving; some of them are just supposed to sit there being strange until the next person wanders past it.</p>
<p>I built the chatroom on this site to actually work, live, between whoever happens to be here: no fake activity, no bot dressed up as a regular to make the room look busier than it is. Which means some nights it''ll be exactly this: quiet, a little lonely, three people typing nothing at each other on purpose. I think that''s worth keeping honest rather than papering over. The internet has plenty of rooms that perform liveliness at you. Let this be the one that just tells you the truth about how many people are actually up.</p>
<p>If you''re reading this at a reasonable hour, none of this will make much sense, and that''s fine too, come back later. The room keeps different company after midnight.</p>',
  'the daytime internet wants a reply. the graveyard shift just wants a witness.',
  'dot_matrix, 3:14am, unverifiable',
  4,
  true,
  3,
  '2026-08-03T12:00:00Z'::timestamptz
);

insert into articles (slug, title, dek, byline, body_html, pull_quote, pull_cite, read_minutes, published, sort_order, created_at) values (
  'good-guestbook-entry',
  'how to leave a good guestbook entry',
  'a short manifesto, and a nudge toward ours',
  'dot_matrix',
  '<p>Every guestbook I''ve ever kept has the same three entries repeated with minor variation: "cool site!", "nice work :)", and one from somebody''s alt account testing whether the form actually works. I understand the instinct: you found a page, you want to leave proof you were there, and "cool site" is the fastest available proof. It''s also, respectfully, completely forgettable the moment I read it. Not because it''s unkind. Because it could have been left on literally any page on the internet, including ones I hate.</p>
<p>A good entry is specific to the place it''s signing. That''s the whole trick, and it''s smaller than it sounds. You don''t need to write an essay; some of my favorite entries anywhere are a single sentence. What they have in common is that the sentence couldn''t have been copy-pasted somewhere else without sounding wrong.</p>
<p>Some things that make an entry worth stamping, in no particular order: mention something you actually noticed, even something small and slightly odd: the barcode that doesn''t scan to anything, a typo you caught, the fact that the chatroom was empty when you visited. Tell me where you came from, if you remember; half the joy of running a small page is finding out how someone stumbled onto it. Sign with whatever name you want to be known by here; it doesn''t have to match anywhere else, that''s sort of the point of a handle. And if you genuinely have nothing to say, a well-placed piece of ascii art has never once been unwelcome. I will take a lovingly misaligned cat over "great job!" every single time.</p>
<p>None of this is a rule, exactly: the guestbook doesn''t reject entries that break it, and it shouldn''t. But if you''re standing at the form wondering what to write, that''s the nudge: say the specific true thing, not the generic nice thing. It''ll mean more to whoever reads it later, including, probably, you.</p>
<p>The book''s open whenever you''re ready. <a href="guestbook.html">Go sign it →</a></p>',
  '"cool site" tells me you found a website. one specific sentence tells me you actually read it.',
  'dot_matrix',
  4,
  true,
  4,
  '2026-08-07T12:00:00Z'::timestamptz
);

insert into movies (title, year, rating, director, writer, stars, synopsis, poster_key, poster_url, video_key, video_url, bytes, published, sort_order) values (
  'Donnie Darko',
  2001,
  '8.0/10 IMDb',
  'Richard Kelly',
  'Richard Kelly',
  'Jake Gyllenhaal, Jena Malone, Patrick Swayze',
  'a stranger in a rotting rabbit suit tells a sleepwalking teenager that the world ends in 28 days, then a jet engine crashes into his bedroom with no explanation. what follows might be a breakdown, might be a time loop, all of it set to a note-perfect ''80s soundtrack.',
  null,
  'img/donnie-darko-poster.jpg',
  'donnie-darko.mp4',
  'https://pub-e093af06fd504a65a540c7dfc9600eb1.r2.dev/donnie-darko.mp4',
  602670535,
  true,
  0
);

insert into movies (title, year, rating, director, writer, stars, synopsis, poster_key, poster_url, video_key, video_url, bytes, published, sort_order) values (
  'Zodiac',
  2007,
  '7.7/10 IMDb',
  'David Fincher',
  'James Vanderbilt',
  'Jake Gyllenhaal, Mark Ruffalo, Robert Downey Jr.',
  'in the late 1960s and ''70s, a serial killer taunts the San Francisco Bay Area press with cipher letters and cryptic threats. a cartoonist becomes obsessed with cracking a case that outlasted the cops assigned to solve it.',
  null,
  'img/zodiac-poster.jpg',
  'zodiac.mp4',
  'https://pub-e093af06fd504a65a540c7dfc9600eb1.r2.dev/zodiac.mp4',
  2618380518,
  true,
  1
);

