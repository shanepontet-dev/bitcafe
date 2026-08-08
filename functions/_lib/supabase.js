// bit cafe admin: talk to Supabase's PostgREST API with the
// service_role key, which bypasses row-level security entirely. this
// must never run anywhere the browser can reach directly -- it's only
// ever imported from functions/api/admin/**, all of which sit behind
// the session check in that directory's _middleware.js.
//
// plain fetch() against the REST API rather than pulling in
// @supabase/supabase-js: a handful of select/insert/update/delete
// calls don't need the full client library, and this keeps the
// Functions bundle to one real dependency (aws4fetch, for R2).

function client(env) {
  const base = env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1";
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
  return { base, headers };
}

async function failIfNotOk(res, verb, table) {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`supabase ${verb} ${table} failed: ${res.status} ${detail}`);
  }
}

// `query` is a raw PostgREST query string starting with "?", e.g.
// "?select=*&order=created_at.desc&limit=50" -- callers build it
// themselves since each table's admin view needs different shaping.
export async function sbSelect(env, table, query = "") {
  const { base, headers } = client(env);
  const res = await fetch(`${base}/${table}${query}`, { headers });
  await failIfNotOk(res, "select", table);
  return res.json();
}

export async function sbInsert(env, table, row) {
  const { base, headers } = client(env);
  const res = await fetch(`${base}/${table}`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  await failIfNotOk(res, "insert", table);
  const rows = await res.json();
  return rows[0];
}

export async function sbUpdate(env, table, id, patch) {
  const { base, headers } = client(env);
  const res = await fetch(`${base}/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  await failIfNotOk(res, "update", table);
  const rows = await res.json();
  return rows[0];
}

export async function sbDelete(env, table, id) {
  const { base, headers } = client(env);
  const res = await fetch(`${base}/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  });
  await failIfNotOk(res, "delete", table);
}
