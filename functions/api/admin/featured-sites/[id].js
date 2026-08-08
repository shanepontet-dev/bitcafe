import { sbSelect, sbUpdate, sbDelete } from "../../../_lib/supabase.js";
import { deleteObjects } from "../../../_lib/r2.js";
import { json, jsonError } from "../../../_lib/http.js";
import { clampInt, clampStr } from "../../../_lib/validate.js";

const BUTTON_STYLES = new Set(["default", "red", "teal"]);

// only touches fields actually present in the request body, same
// convention as articles/[id].js. artwork itself can't be added or
// swapped here -- same convention as wall-buttons/[id].js -- so
// image_key/image_url are never patchable.
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
  if ("description" in body) patch.description = clampStr(body.description, 280);
  if ("button_style" in body) patch.button_style = BUTTON_STYLES.has(body.button_style) ? body.button_style : "default";
  if ("published" in body) patch.published = !!body.published;
  if ("sort_order" in body) patch.sort_order = clampInt(body.sort_order, -1000000, 1000000, 0);
  patch.updated_at = new Date().toISOString();

  try {
    const updated = await sbUpdate(env, "featured_sites", params.id, patch);
    if (!updated) return jsonError("not found", 404);
    return json(updated);
  } catch (err) {
    return jsonError(String(err), 502);
  }
}

// deletes the R2 object (if this coupon has one) before the row, same
// order/reasoning as wall-buttons/[id].js and movies/[id].js.
export async function onRequestDelete(context) {
  const { env, params } = context;
  try {
    const rows = await sbSelect(env, "featured_sites", `?id=eq.${encodeURIComponent(params.id)}&select=image_key`);
    const row = rows[0];
    if (row && row.image_key) {
      await deleteObjects(env.MEDIA_BUCKET, [row.image_key]);
    }
    await sbDelete(env, "featured_sites", params.id);
    return json({ ok: true });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
