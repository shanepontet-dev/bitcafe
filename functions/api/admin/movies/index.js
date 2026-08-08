import { sbSelect, sbInsert } from "../../../_lib/supabase.js";
import { bucketUsage, putObject, publicUrlFor } from "../../../_lib/r2.js";
import { json, jsonError } from "../../../_lib/http.js";
import { clampInt, clampStr } from "../../../_lib/validate.js";

const R2_FREE_TIER_BYTES = 10 * 1024 * 1024 * 1024; // 10GB/month, the free plan's storage cap
const MAX_POSTER_BYTES = 8 * 1024 * 1024; // matches uploads/poster.js's cap

const EXT_BY_CONTENT_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// fetched server-side rather than by the browser: cross-origin images
// (IMDb's posters live on Amazon's media CDN) can't be read into a
// File the way uploads/poster.js expects without the source opting
// into CORS, which that CDN doesn't. mirrors uploads/poster.js's key
// convention so both paths produce the same shape of row.
async function fetchAndStorePoster(env, sourceUrl) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`poster fetch failed: ${res.status}`);
  const contentType = (res.headers.get("Content-Type") || "").split(";")[0].trim();
  if (!contentType.startsWith("image/")) throw new Error("poster source wasn't an image");
  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) throw new Error("empty poster");
  if (buf.byteLength > MAX_POSTER_BYTES) throw new Error("poster too large (max 8MB)");

  const ext = EXT_BY_CONTENT_TYPE[contentType] || ".jpg";
  const key = `posters/${Date.now()}-imdb${ext}`;
  await putObject(env.MEDIA_BUCKET, key, buf, contentType);
  return { key, url: publicUrlFor(env, key) };
}

// list every movie plus the *real* bucket usage (walked live from R2,
// not summed from the movies table -- see bucketUsage's comment) so
// the dashboard can show a storage meter before every upload.
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const [rows, usage] = await Promise.all([
      sbSelect(env, "movies", "?select=*&order=sort_order.asc,created_at.asc"),
      bucketUsage(env.MEDIA_BUCKET),
    ]);
    return json({ movies: rows, storage: { ...usage, capBytes: R2_FREE_TIER_BYTES } });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}

// called *after* the browser has already uploaded the video (via a
// presigned URL from uploads/presign.js) and the poster (via
// uploads/poster.js) -- this just writes the metadata row pointing at
// what's already sitting in the bucket. video_key is only set for an
// R2 upload; a screening linked to a video hosted elsewhere has just a
// video_url and no key (so DELETE, which only ever deletes objects it
// has a key for, leaves the other host alone).
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad request", 400);
  }

  if (!body.title || !body.synopsis || !body.video_url) {
    return jsonError("title, synopsis, and a video (uploaded or linked) are required", 400);
  }
  if (!body.video_key && !/^https?:\/\//i.test(body.video_url)) {
    return jsonError("that video link needs to start with http:// or https://", 400);
  }

  let posterKey = body.poster_key || null;
  let posterUrl = body.poster_url || null;
  // poster_source_url comes from the IMDb lookup, not from an upload --
  // fetch it into our own bucket so the screening doesn't depend on
  // IMDb's CDN staying up. best-effort: a broken/slow poster link
  // shouldn't block saving the screening itself.
  if (!posterKey && !posterUrl && body.poster_source_url) {
    try {
      const fetched = await fetchAndStorePoster(env, body.poster_source_url);
      posterKey = fetched.key;
      posterUrl = fetched.url;
    } catch {
      // leave posterKey/posterUrl null -- same as not having picked one
    }
  }

  const row = {
    title: clampStr(body.title, 120),
    year: body.year ? clampInt(body.year, 1888, 2100, null) : null,
    rating: body.rating ? clampStr(body.rating, 20) : null,
    director: body.director ? clampStr(body.director, 120) : null,
    writer: body.writer ? clampStr(body.writer, 200) : null,
    stars: body.stars ? clampStr(body.stars, 300) : null,
    synopsis: clampStr(body.synopsis, 600),
    poster_key: posterKey,
    poster_url: posterUrl,
    video_key: body.video_key || null,
    video_url: clampStr(body.video_url, 2000),
    bytes: Number.isFinite(body.bytes) ? Math.max(0, Math.floor(body.bytes)) : null,
    published: body.published !== false,
    sort_order: clampInt(body.sort_order, -1000000, 1000000, 0),
  };

  try {
    const created = await sbInsert(env, "movies", row);
    return json(created, { status: 201 });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
