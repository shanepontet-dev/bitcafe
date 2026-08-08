// bit cafe: Worker entry point for /api/admin/*.
//
// this project deploys as a Cloudflare Worker with static assets
// (Cloudflare's current default for a new GitHub-connected project --
// the older "Pages" product, which auto-routed a /functions directory
// for you, still exists but isn't what the dashboard offers for new
// projects anymore). wrangler.jsonc's `assets.run_worker_first` sends
// only /api/admin/* requests here; every other path (every public
// page, all of /admin's own HTML/CSS/JS) is served directly as a
// static file and never touches this script.
//
// the actual endpoint logic still lives in functions/api/admin/**,
// written as small onRequestGet/onRequestPost/onRequestPatch/
// onRequestDelete exports -- that shape was originally chosen to
// match Cloudflare Pages Functions' file-based routing convention.
// it isn't auto-routed here, so this file is the manual router that
// convention would otherwise have given us for free: match the path,
// pull any :id out of it, build the same {request, env, params}
// shape those functions already expect, and call the right one. none
// of the functions/ files themselves needed to change.
import { verifySession } from "../functions/_lib/session.js";
import { jsonError } from "../functions/_lib/http.js";

import * as login from "../functions/api/admin/login.js";
import * as logout from "../functions/api/admin/logout.js";
import * as articlesIndex from "../functions/api/admin/articles/index.js";
import * as articlesId from "../functions/api/admin/articles/[id].js";
import * as moviesIndex from "../functions/api/admin/movies/index.js";
import * as moviesId from "../functions/api/admin/movies/[id].js";
import * as submissionsIndex from "../functions/api/admin/submissions/index.js";
import * as submissionsId from "../functions/api/admin/submissions/[id].js";
import * as uploadPresign from "../functions/api/admin/uploads/presign.js";
import * as uploadPoster from "../functions/api/admin/uploads/poster.js";

const PUBLIC_PATHS = new Set(["/api/admin/login", "/api/admin/logout"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const context = { request, env, ctx, params: {} };

    if (!path.startsWith("/api/admin/")) {
      // shouldn't happen given run_worker_first's route list, but
      // fall back to serving the static asset rather than 404ing.
      return env.ASSETS.fetch(request);
    }

    // ---- the session gate every route but login/logout sits behind
    // (this replaces what functions/api/admin/_middleware.js did
    // under Pages' routing) -----------------------------------------
    if (!PUBLIC_PATHS.has(path)) {
      if (!env.SESSION_SECRET) {
        return jsonError("admin backend isn't configured yet (missing SESSION_SECRET)", 500);
      }
      const ok = await verifySession(request, env.SESSION_SECRET);
      if (!ok) return jsonError("not logged in", 401);
    }

    // ---- routes -------------------------------------------------
    if (path === "/api/admin/login" && method === "POST") return login.onRequestPost(context);
    if (path === "/api/admin/logout" && method === "POST") return logout.onRequestPost(context);

    if (path === "/api/admin/articles") {
      if (method === "GET") return articlesIndex.onRequestGet(context);
      if (method === "POST") return articlesIndex.onRequestPost(context);
    }
    let m = path.match(/^\/api\/admin\/articles\/([^/]+)$/);
    if (m) {
      context.params.id = decodeURIComponent(m[1]);
      if (method === "PATCH") return articlesId.onRequestPatch(context);
      if (method === "DELETE") return articlesId.onRequestDelete(context);
    }

    if (path === "/api/admin/movies") {
      if (method === "GET") return moviesIndex.onRequestGet(context);
      if (method === "POST") return moviesIndex.onRequestPost(context);
    }
    m = path.match(/^\/api\/admin\/movies\/([^/]+)$/);
    if (m) {
      context.params.id = decodeURIComponent(m[1]);
      if (method === "PATCH") return moviesId.onRequestPatch(context);
      if (method === "DELETE") return moviesId.onRequestDelete(context);
    }

    if (path === "/api/admin/submissions" && method === "GET") {
      return submissionsIndex.onRequestGet(context);
    }
    m = path.match(/^\/api\/admin\/submissions\/([^/]+)$/);
    if (m) {
      context.params.id = decodeURIComponent(m[1]);
      if (method === "DELETE") return submissionsId.onRequestDelete(context);
    }

    if (path === "/api/admin/uploads/presign" && method === "POST") {
      return uploadPresign.onRequestPost(context);
    }
    if (path === "/api/admin/uploads/poster" && method === "POST") {
      return uploadPoster.onRequestPost(context);
    }

    return jsonError("not found", 404);
  },
};
