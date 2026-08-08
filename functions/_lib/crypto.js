// bit cafe admin: small Web Crypto helpers shared by session.js and
// login.js. the Workers runtime has no built-in timing-safe compare
// (Node's crypto.timingSafeEqual needs nodejs_compat, not worth
// switching on for one comparison) -- HMAC-ing both sides down to a
// fixed-length digest, then comparing those digests byte-by-byte
// without short-circuiting, is the standard workaround.

export async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

export function bytesToBase64Url(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// both inputs here are always fixed-length HMAC-SHA256 digests (32
// bytes) computed from the caller's own secret -- never raw user
// input -- so this doesn't need to hide a length mismatch, just avoid
// leaking *which byte* differed via early exit.
export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
