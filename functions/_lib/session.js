// bit cafe admin: stateless login sessions
// -----------------------------------------------------------------
// no KV, no D1, no session table -- a session is just a short signed
// token the browser holds as an HttpOnly cookie: `<expiry>.<hmac>`.
// every /api/admin/* request re-verifies the signature against
// SESSION_SECRET (see _middleware.js). rotating SESSION_SECRET
// instantly logs everyone out, which is the "kill switch" you'd want
// if it ever leaked.

import { hmacSha256, bytesToBase64Url, base64UrlToBytes, timingSafeEqual } from "./crypto.js";

export const COOKIE_NAME = "bc_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

export async function createSessionCookie(secret) {
  const exp = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = String(exp);
  const sig = bytesToBase64Url(await hmacSha256(secret, payload));
  const token = `${payload}.${sig}`;
  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join("; ");
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i === -1) return;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

export async function verifySession(request, secret) {
  const token = parseCookies(request.headers.get("Cookie"))[COOKIE_NAME];
  if (!token) return false;

  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);

  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  let given;
  try {
    given = base64UrlToBytes(token.slice(dot + 1));
  } catch {
    return false;
  }
  const expected = await hmacSha256(secret, payload);
  return timingSafeEqual(given, expected);
}
