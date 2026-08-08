import { sbSelect, sbInsert } from "../../../_lib/supabase.js";
import { json, jsonError } from "../../../_lib/http.js";
import { clampInt, clampStr } from "../../../_lib/validate.js";

function normalizeWallButton(body) {
  return {
    site_name: clampStr(body.site_name, 60),
    url: clampStr(body.url, 300),
    tagline: body.tagline ? clampStr(body.tagline, 120) : null,
    image_key: clampStr(body.image_key, 300),
    image_url: clampStr(body.image_url, 2000),
    published: body.published !== false,
    sort_order: clampInt(body.sort_order, -1000000, 1000000, 0),
  };
}

// list every wall button, published or not -- links.html and
// index.html only ever read published=true themselves, straight from
// Supabase, appended after the pages' own hand-authored badges; this
// endpoint is the admin dashboard's full view.
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const rows = await sbSelect(env, "wall_buttons", "?select=*&order=sort_order.asc,created_at.asc");
    return json(rows);
  } catch (err) {
    return jsonError(String(err), 502);
  }
}

// called *after* the browser has already uploaded the button art (via
// /api/admin/uploads/badge) -- this just writes the metadata row
// pointing at what's already sitting in the bucket, same shape as
// movies/index.js's POST.
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad request", 400);
  }

  const row = normalizeWallButton(body);
  if (!row.site_name || !row.url || !row.image_key || !row.image_url) {
    return jsonError("site name, url, and an uploaded image are required", 400);
  }
  if (!/^https?:\/\//i.test(row.url)) {
    return jsonError("that url needs to start with http:// or https://", 400);
  }

  try {
    const created = await sbInsert(env, "wall_buttons", row);
    return json(created, { status: 201 });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
