// bit cafe admin: tiny JSON response helpers, shared so every route
// returns errors in the same shape for admin-articles.js /
// admin-movies.js / admin-submissions.js to handle uniformly.

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

export function jsonError(message, status = 400) {
  return json({ error: message }, { status });
}
