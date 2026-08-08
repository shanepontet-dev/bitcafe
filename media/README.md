# media/

`movie-night.html` supports any number of screenings, each its own block
in the HTML. Currently playing: `donnie-darko.mp4` and `zodiac.mp4`.

## adding another screening

1. drop the video file here, named whatever you like (kebab-case, no
   spaces — `some-movie.mp4`, not `Some Movie (2001).mp4`).
2. in `movie-night.html`, copy one of the existing `<div class="ticket
   ticket-torn">…</div>` screening blocks, paste it above or below the
   others, and update: the title in `.ticket-head`, the poster `<img
   src>`, the `<video data-src="media/your-file.mp4">`, the stats in
   `.movie-stats`, and the synopsis paragraph.
3. reload the page. `js/movie-night.js` finds every `video[data-src]`
   on the page automatically and checks whether that file exists — no
   script changes needed. a missing file shows the same honest "not
   loaded yet" notice as always.

`.mp4` (H.264 video) plays in the widest range of browsers without
extra plugins. If your source file is a different format (`.mov`,
`.mkv`, etc.), convert it first — QuickTime Player's File → Export, or
`ffmpeg -i input.mov output.mp4` on the command line, both work.

Keep an eye on file size if you're deploying to a free static host —
most have per-file or bandwidth limits. A few hundred MB is usually
fine; multi-GB files may need a video host (YouTube unlisted, Vimeo,
etc.) instead, with the `<video>` tag in `movie-night.html` swapped
for an embed.
