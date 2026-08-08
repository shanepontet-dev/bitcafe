import { sbSelect, sbUpdate, sbDelete } from "../../../_lib/supabase.js";
import { deleteObjects } from "../../../_lib/r2.js";
import { json, jsonError } from "../../../_lib/http.js";
import { clampInt, clampStr } from "../../../_lib/validate.js";

// metadata only -- the artwork itself can't be swapped here, same
// convention as movies/[id].js's poster/video (delete and re-add to
// replace the image instead of quietly orphaning the old R2 object).
export async function onRequestPatch(context) {
  const { request, env, params } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad request", 400);
  }

  const patch = {};
  if ("site_name" in body) patch.site_name = clampStr(body.site_name, 60);
  if ("url" in body) patch.url = clampStr(body.url, 300);
  if ("tagline" in body) patch.tagline = body.tagline ? clampStr(body.tagline, 120) : null;
  if ("published" in body) patch.published = !!body.published;
  if ("sort_order" in body) patch.sort_order = clampInt(body.sort_order, -1000000, 1000000, 0);
  patch.updated_at = new Date().toISOString();

  try {
    const updated = await sbUpdate(env, "wall_buttons", params.id, patch);
    if (!updated) return jsonError("not found", 404);
    return json(updated);
  } catch (err) {
    return jsonError(String(err), 502);
  }
}

// deletes the R2 object first, then the row -- same order/reasoning as
// movies/[id].js: a failed row delete never leaves an orphaned object
// invisible to the admin list but still burning storage quota.
export async function onRequestDelete(context) {
  const { env, params } = context;
  try {
    const rows = await sbSelect(env, "wall_buttons", `?id=eq.${encodeURIComponent(params.id)}&select=image_key`);
    const row = rows[0];
    if (row) {
      await deleteObjects(env.MEDIA_BUCKET, [row.image_key]);
    }
    await sbDelete(env, "wall_buttons", params.id);
    return json({ ok: true });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
