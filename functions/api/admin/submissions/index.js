// bit cafe admin: read-only view of site_submissions (the webring's
// "request a spot" form on links.html). that table has no select
// policy for anon at all -- previously the only way to read it was
// the raw Supabase Table Editor -- so this is the first time it's
// readable from the site itself. still no auto-publish to the button
// wall: that stays a deliberate hand-edit of links.html, same as
// README.md already documents.

import { sbSelect } from "../../../_lib/supabase.js";
import { json, jsonError } from "../../../_lib/http.js";

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const rows = await sbSelect(env, "site_submissions", "?select=*&order=ts.desc&limit=200");
    return json(rows);
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
