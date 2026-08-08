import { sbSelect, sbInsert } from "../../../_lib/supabase.js";
import { json, jsonError } from "../../../_lib/http.js";
import { slugify, clampInt, clampStr } from "../../../_lib/validate.js";

// list every article, published or not -- articles.html (the public
// page) only ever reads published=true itself, straight from
// Supabase; this endpoint is the admin dashboard's full view.
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const rows = await sbSelect(env, "articles", "?select=*&order=sort_order.asc,created_at.asc");
    return json(rows);
  } catch (err) {
    return jsonError(String(err), 502);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad request", 400);
  }

  const row = normalizeArticle(body);
  if (!row.slug || !row.title || !row.dek || !row.body_html) {
    return jsonError("slug, title, dek, and body are required", 400);
  }

  try {
    const created = await sbInsert(env, "articles", row);
    return json(created, { status: 201 });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}

function normalizeArticle(body) {
  return {
    slug: slugify(body.slug || body.title),
    title: clampStr(body.title, 120),
    dek: clampStr(body.dek, 200),
    byline: clampStr(body.byline || "fletcher", 60),
    body_html: String(body.body_html || ""),
    pull_quote: body.pull_quote ? clampStr(body.pull_quote, 400) : null,
    pull_cite: body.pull_cite ? clampStr(body.pull_cite, 100) : null,
    read_minutes: clampInt(body.read_minutes, 1, 60, 5),
    published: body.published !== false,
    sort_order: clampInt(body.sort_order, -1000000, 1000000, 0),
  };
}
