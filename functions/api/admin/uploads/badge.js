// bit cafe admin: button-wall artwork upload. these are small images
// (an 88x31-style badge, or close to it), well under Cloudflare's
// 100MB Free-plan request cap, so like uploads/poster.js this goes
// straight through the Function's own request body into R2 via the
// native binding -- no presigning needed.

import { putObject, publicUrlFor } from "../../../_lib/r2.js";
import { json, jsonError } from "../../../_lib/http.js";
import { slugify } from "../../../_lib/validate.js";

const MAX_BADGE_BYTES = 5 * 1024 * 1024; // 5MB -- button art, not a movie poster

export async function onRequestPost(context) {
  const { request, env } = context;

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.startsWith("image/")) {
    return jsonError("button art must be an image", 400);
  }

  let filename = request.headers.get("X-Filename") || "badge.png";
  try {
    filename = decodeURIComponent(filename);
  } catch {
    // malformed encoding -- fall back to the raw header value
  }
  const extMatch = filename.match(/\.[a-z0-9]+$/i);
  const ext = (extMatch ? extMatch[0] : ".png").toLowerCase();
  const stem = slugify(filename.replace(/\.[a-z0-9]+$/i, "")) || "badge";
  const key = `badges/${Date.now()}-${stem}${ext}`;

  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_BADGE_BYTES) {
    return jsonError("that image is too large (max 5MB)", 413);
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
