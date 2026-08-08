import { sbDelete } from "../../../_lib/supabase.js";
import { json, jsonError } from "../../../_lib/http.js";

// "dismiss" -- once you've read a request and either added it to the
// button wall by hand or decided to pass, this clears it off the
// list. there's no "undo"; that's fine, the requester's info was only
// ever a one-time pitch.
export async function onRequestDelete(context) {
  const { env, params } = context;
  try {
    await sbDelete(env, "site_submissions", params.id);
    return json({ ok: true });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
