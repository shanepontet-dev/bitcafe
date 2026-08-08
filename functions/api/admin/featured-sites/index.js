import { sbSelect, sbInsert } from "../../../_lib/supabase.js";
import { json, jsonError } from "../../../_lib/http.js";
import { clampInt, clampStr } from "../../../_lib/validate.js";

const BUTTON_STYLES = new Set(["default", "red", "teal"]);

function normalizeFeaturedSite(body) {
  return {
    site_name: clampStr(body.site_name, 60),
    url: clampStr(body.url, 300),
    description: clampStr(body.description, 280),
    button_style: BUTTON_STYLES.has(body.button_style) ? body.button_style : "default",
    // optional: if set, links.html swaps the "visit X ->" text button
    // for this image instead (see js/webring.js). left null, a coupon
    // renders exactly as it always has.
    image_key: body.image_key ? clampStr(body.image_key, 300) : null,
    image_url: body.image_url ? clampStr(body.image_url, 2000) : null,
    published: body.published !== false,
    sort_order: clampInt(body.sort_order, -1000000, 1000000, 0),
  };
}

// list every featured site, published or not -- links.html (the public
// page) only ever reads published=true itself, straight from
// Supabase, appended after the page's own hand-written coupons; this
// endpoint is the admin dashboard's full view.
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const rows = await sbSelect(env, "featured_sites", "?select=*&order=sort_order.asc,created_at.asc");
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

  const row = normalizeFeaturedSite(body);
  if (!row.site_name || !row.url || !row.description) {
    return jsonError("site name, url, and a description are required", 400);
  }
  if (!/^https?:\/\//i.test(row.url)) {
    return jsonError("that url needs to start with http:// or https://", 400);
  }

  try {
    const created = await sbInsert(env, "featured_sites", row);
    return json(created, { status: 201 });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
