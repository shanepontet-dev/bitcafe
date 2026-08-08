// bit cafe admin: password check + session cookie issue. there's no
// accounts system -- one shared ADMIN_PASSWORD (a Cloudflare secret),
// compared with a timing-safe HMAC digest rather than `===` so a
// mistyped guess can't be narrowed down character-by-character via
// response timing. see functions/_lib/session.js for the cookie.

import { hmacSha256, timingSafeEqual } from "../../_lib/crypto.js";
import { createSessionCookie } from "../../_lib/session.js";
import { json, jsonError } from "../../_lib/http.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return jsonError("admin backend isn't configured yet (missing secrets)", 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad request", 400);
  }
  const password = typeof body.password === "string" ? body.password : "";

  const [given, expected] = await Promise.all([
    hmacSha256(env.SESSION_SECRET, password),
    hmacSha256(env.SESSION_SECRET, env.ADMIN_PASSWORD),
  ]);

  if (!timingSafeEqual(given, expected)) {
    return jsonError("wrong password", 401);
  }

  const cookie = await createSessionCookie(env.SESSION_SECRET);
  return json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}
