import { sbSelect, sbInsert } from "../../../_lib/supabase.js";
import { bucketUsage } from "../../../_lib/r2.js";
import { json, jsonError } from "../../../_lib/http.js";
import { clampInt, clampStr } from "../../../_lib/validate.js";

const R2_FREE_TIER_BYTES = 10 * 1024 * 1024 * 1024; // 10GB/month, the free plan's storage cap

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
// what's already sitting in the bucket.
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad request", 400);
  }

  if (!body.title || !body.synopsis || !body.video_key || !body.video_url) {
    return jsonError("title, synopsis, and an uploaded video are required", 400);
  }

  const row = {
    title: clampStr(body.title, 120),
    year: body.year ? clampInt(body.year, 1888, 2100, null) : null,
    rating: body.rating ? clampStr(body.rating, 20) : null,
    director: body.director ? clampStr(body.director, 120) : null,
    writer: body.writer ? clampStr(body.writer, 200) : null,
    stars: body.stars ? clampStr(body.stars, 300) : null,
    synopsis: clampStr(body.synopsis, 600),
    poster_key: body.poster_key || null,
    poster_url: body.poster_url || null,
    video_key: body.video_key,
    video_url: body.video_url,
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
