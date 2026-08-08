import { sbSelect, sbUpdate, sbDelete } from "../../../_lib/supabase.js";
import { deleteObjects } from "../../../_lib/r2.js";
import { json, jsonError } from "../../../_lib/http.js";
import { clampInt, clampStr } from "../../../_lib/validate.js";

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad request", 400);
  }

  const patch = {};
  if ("title" in body) patch.title = clampStr(body.title, 120);
  if ("year" in body) patch.year = body.year ? clampInt(body.year, 1888, 2100, null) : null;
  if ("rating" in body) patch.rating = body.rating ? clampStr(body.rating, 20) : null;
  if ("director" in body) patch.director = body.director ? clampStr(body.director, 120) : null;
  if ("writer" in body) patch.writer = body.writer ? clampStr(body.writer, 200) : null;
  if ("stars" in body) patch.stars = body.stars ? clampStr(body.stars, 300) : null;
  if ("synopsis" in body) patch.synopsis = clampStr(body.synopsis, 600);
  if ("published" in body) patch.published = !!body.published;
  if ("sort_order" in body) patch.sort_order = clampInt(body.sort_order, -1000000, 1000000, 0);
  patch.updated_at = new Date().toISOString();

  try {
    const updated = await sbUpdate(env, "movies", params.id, patch);
    if (!updated) return jsonError("not found", 404);
    return json(updated);
  } catch (err) {
    return jsonError(String(err), 502);
  }
}

// deletes the R2 objects (video + poster) first, then the row -- in
// that order, so a failed row delete never leaves an orphaned object
// invisible to the admin list but still burning storage quota. if the
// row delete fails after a successful object delete, the row just
// shows broken media next time and can be deleted again by hand.
export async function onRequestDelete(context) {
  const { env, params } = context;
  try {
    const rows = await sbSelect(
      env,
      "movies",
      `?id=eq.${encodeURIComponent(params.id)}&select=poster_key,video_key`
    );
    const row = rows[0];
    if (row) {
      await deleteObjects(env.MEDIA_BUCKET, [row.poster_key, row.video_key]);
    }
    await sbDelete(env, "movies", params.id);
    return json({ ok: true });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
