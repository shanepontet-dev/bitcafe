import { sbUpdate, sbDelete } from "../../../_lib/supabase.js";
import { json, jsonError } from "../../../_lib/http.js";
import { slugify, clampInt, clampStr } from "../../../_lib/validate.js";

// only touches fields actually present in the request body, so a
// partial edit (e.g. just toggling "published" from the dashboard
// list) can't blank out the rest of the row.
export async function onRequestPatch(context) {
  const { request, env, params } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad request", 400);
  }

  const patch = {};
  if ("slug" in body) {
    const nextSlug = slugify(body.slug);
    if (nextSlug) patch.slug = nextSlug; // empty slug means "leave it alone", not "blank it out"
  }
  if ("title" in body) patch.title = clampStr(body.title, 120);
  if ("dek" in body) patch.dek = clampStr(body.dek, 200);
  if ("byline" in body) patch.byline = clampStr(body.byline, 60);
  if ("body_html" in body) patch.body_html = String(body.body_html || "");
  if ("pull_quote" in body) patch.pull_quote = body.pull_quote ? clampStr(body.pull_quote, 400) : null;
  if ("pull_cite" in body) patch.pull_cite = body.pull_cite ? clampStr(body.pull_cite, 100) : null;
  if ("read_minutes" in body) patch.read_minutes = clampInt(body.read_minutes, 1, 60, 5);
  if ("published" in body) patch.published = !!body.published;
  if ("sort_order" in body) patch.sort_order = clampInt(body.sort_order, -1000000, 1000000, 0);
  patch.updated_at = new Date().toISOString();

  try {
    const updated = await sbUpdate(env, "articles", params.id, patch);
    if (!updated) return jsonError("not found", 404);
    return json(updated);
  } catch (err) {
    return jsonError(String(err), 502);
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  try {
    await sbDelete(env, "articles", params.id);
    return json({ ok: true });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
