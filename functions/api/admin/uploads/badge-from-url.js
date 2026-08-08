// bit cafe admin: fetches an image from an external URL and stores it
// in R2 -- backs the button wall's drag-and-drop zone. when a badge is
// dragged in from a webpage rather than dropped as a real file, the
// browser only ever hands the page the image's own URL, never its
// bytes; reading those bytes with the browser's own fetch() would
// usually be blocked by the source site's CORS policy. fetching it
// server-side has no such restriction -- same trick movies/index.js's
// fetchAndStorePoster uses for IMDb posters.

import { putObject, publicUrlFor } from "../../../_lib/r2.js";
import { json, jsonError } from "../../../_lib/http.js";
import { slugify } from "../../../_lib/validate.js";

const MAX_BADGE_BYTES = 5 * 1024 * 1024; // matches uploads/badge.js's cap

const EXT_BY_CONTENT_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad request", 400);
  }

  const sourceUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^https?:\/\//i.test(sourceUrl)) {
    return jsonError("that doesn't look like an image url", 400);
  }

  let res;
  try {
    res = await fetch(sourceUrl);
  } catch {
    return jsonError("couldn't fetch that image", 502);
  }
  if (!res.ok) return jsonError(`image fetch failed: ${res.status}`, 502);

  const contentType = (res.headers.get("Content-Type") || "").split(";")[0].trim();
  if (!contentType.startsWith("image/")) {
    return jsonError("that url isn't an image", 400);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) return jsonError("empty image", 400);
  if (buf.byteLength > MAX_BADGE_BYTES) return jsonError("that image is too large (max 5MB)", 413);

  const ext = EXT_BY_CONTENT_TYPE[contentType] || ".png";
  let stem = "badge";
  try {
    const pathname = new URL(sourceUrl).pathname;
    stem = slugify(pathname.replace(/\.[a-z0-9]+$/i, "").split("/").pop()) || "badge";
  } catch {
    // malformed url snuck past the regex check above -- fall back to the generic stem
  }
  const key = `badges/${Date.now()}-${stem}${ext}`;

  try {
    await putObject(env.MEDIA_BUCKET, key, buf, contentType);
    return json({ key, url: publicUrlFor(env, key) });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
