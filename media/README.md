# media/

This folder is no longer where movie night's screenings come from.

Screenings are managed from **[/admin](../admin/index.html)** now (see
the root `README.md`, "the back office"): title, poster, stats, and
the video file itself all get uploaded there, straight to the Cloudflare
R2 bucket, and `movie-night.html` renders whatever's marked published
by reading the `movies` table. There's no HTML to hand-edit and no
file to drop in this folder anymore.

`.mp4` (H.264 video) still plays in the widest range of browsers
without extra plugins — if your source file is something else
(`.mov`, `.mkv`, etc.), convert it before uploading (QuickTime
Player's File → Export, or `ffmpeg -i input.mov output.mp4`).

This folder is kept around only for the two local source files
(`donnie-darko.mp4`, `zodiac.mp4` — both git-ignored, never committed)
and the borrowed fishing-game asset packs documented below; neither is
read by the live site at runtime anymore.
