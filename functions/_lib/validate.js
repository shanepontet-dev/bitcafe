// bit cafe admin: small shared input-shaping helpers. everything the
// admin API accepts gets clamped/trimmed here rather than trusting
// the browser form -- same "shape, not identity" spirit as the
// public-facing RLS policies in supabase/schema.sql, just enforced in
// the Function instead of the database (these tables have no anon
// write policy at all, so the database itself never sees a raw form
// submission -- this is the only checkpoint).

export function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function clampStr(value, maxLength) {
  return String(value == null ? "" : value).slice(0, maxLength);
}
