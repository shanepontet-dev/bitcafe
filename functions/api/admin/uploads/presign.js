// bit cafe admin: hand the browser a one-shot presigned PUT URL so it
// can upload a movie file straight to R2 (see functions/_lib/r2.js
// for why -- Free-plan Function requests cap at 100MB, real movie
// files don't). the browser PUTs directly to the returned uploadUrl
// with an XMLHttpRequest for progress, then POSTs to
// /api/admin/movies with the returned key/publicUrl once it's done.

import { presignPutUrl, publicUrlFor } from "../../../_lib/r2.js";
import { json, jsonError } from "../../../_lib/http.js";
import { slugify } from "../../../_lib/validate.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_BASE_URL"];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) {
    return jsonError(`admin backend isn't configured yet (missing ${missing.join(", ")})`, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad request", 400);
  }

  const filename = typeof body.filename === "string" && body.filename ? body.filename : "movie.mp4";
  const extMatch = filename.match(/\.[a-z0-9]+$/i);
  const ext = (extMatch ? extMatch[0] : ".mp4").toLowerCase();
  const stem = slugify(filename.replace(/\.[a-z0-9]+$/i, "")) || "movie";
  const key = `movies/${Date.now()}-${stem}${ext}`;

  try {
    const uploadUrl = await presignPutUrl(env, key);
    return json({ key, uploadUrl, publicUrl: publicUrlFor(env, key) });
  } catch (err) {
    return jsonError(String(err), 502);
  }
}
