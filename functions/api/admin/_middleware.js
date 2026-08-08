// bit cafe admin: gates every /api/admin/* request behind the session
// cookie, except login (which is how you get the cookie) and logout
// (which should always succeed, even against a stale/expired cookie,
// so a stuck browser can always clear itself). Pages Functions
// middleware has no route-exclusion syntax of its own -- the bypass
// check just lives here. see functions/_lib/session.js for what the
// cookie actually is.

import { verifySession } from "../../_lib/session.js";
import { jsonError } from "../../_lib/http.js";

const PUBLIC_PATHS = new Set(["/api/admin/login", "/api/admin/logout"]);

export async function onRequest(context) {
  const { request, env, next } = context;
  const { pathname } = new URL(request.url);
  if (PUBLIC_PATHS.has(pathname)) return next();

  if (!env.SESSION_SECRET) {
    return jsonError("admin backend isn't configured yet (missing SESSION_SECRET)", 500);
  }

  const ok = await verifySession(request, env.SESSION_SECRET);
  if (!ok) return jsonError("not logged in", 401);

  return next();
}
