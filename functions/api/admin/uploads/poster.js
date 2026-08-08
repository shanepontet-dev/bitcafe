// bit cafe admin: posters are small (a few hundred KB, well under
// Cloudflare's 100MB Free-plan request cap), so unlike the movie file
// itself, they go straight through this Function's own request body
// into R2 via the native binding -- no presigning needed.

import { putObject, publicUrlFor } from "../../../_lib/r2.js";
import { json, jsonError } from "../../../_lib/http.js";
import { slugify } from "../../../_lib/validate.js";

const MAX_POSTER_BYTES = 8 * 1024 * 1024; // 8MB -- a poster image, not a movie

export async function onRequestPost(context) {
  const { request, env } = context;

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.startsWith("image/")) {
    return jsonError("poster must be an image", 400);
  }

  let filename = request.headers.get("X-Filename") || "poster.jpg";
  try {
    filename = decodeURIComponent(filename);
  } catch {
    // malformed encoding -- fall back to the raw header value
  }
  const extMatch = filename.match(/\.[a-z0-9]+$/i);
  const ext = (extMatch ? extMatch[0] : ".jpg").toLowerCase();
  const stem = slugify(filename.replace(/\.[a-z0-9]+$/i, "")) || "poster";
  const key = `posters/${Date.now()}-${stem}${ext}`;

  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_POSTER_BYTES) {
    return jsonError("poster too large (max 8MB)", 413);
  }
  if (buf.byteLength === 0) {
    return jsonError("empty upload", 400);
  }

  try {
    await putObject(env.MEDIA_BUCKET, key, buf, contentType);
    return json({ key, url: publicUrlFor(env, key) });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
