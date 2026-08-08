// bit cafe admin: "fill this in from IMDb" -- the admin pastes a
// title-page URL (or just its tt-id) and gets back the fields the
// movie form asks for. this goes through OMDb (https://omdbapi.com)
// rather than fetching/scraping IMDb's own pages: IMDb doesn't offer a
// public API and its terms don't allow scraping it, while OMDb is a
// small free service built specifically to serve IMDb's data by
// tt-id -- one request, no HTML to parse, no ToS problem.
//
// requires an OMDB_API_KEY secret (free at https://omdbapi.com/apikey.aspx,
// 1,000 requests/day on the free tier -- plenty for an admin dashboard).
// see README.md's admin setup section.

import { json, jsonError } from "../../../_lib/http.js";
import { clampStr } from "../../../_lib/validate.js";

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.OMDB_API_KEY) {
    return jsonError("admin backend isn't configured yet (missing OMDB_API_KEY -- see README.md)", 500);
  }

  const raw = new URL(request.url).searchParams.get("imdb") || "";
  const match = raw.match(/tt\d{6,9}/);
  if (!match) return jsonError("that doesn't look like an IMDb link or id", 400);
  const imdbId = match[0];

  let data;
  try {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${imdbId}&plot=full&apikey=${env.OMDB_API_KEY}`
    );
    data = await res.json();
  } catch {
    return jsonError("couldn't reach OMDb", 502);
  }

  if (data.Response === "False") {
    return jsonError(data.Error || "movie not found", 404);
  }
  if (data.Type && data.Type !== "movie") {
    return jsonError(`that's a ${data.Type}, not a movie -- fill it in by hand`, 400);
  }

  const clean = (v) => (v && v !== "N/A" ? v : "");
  const year = /^\d{4}/.test(data.Year || "") ? parseInt(data.Year, 10) : null;
  const rating = clean(data.imdbRating) ? `${data.imdbRating}/10 IMDb` : "";

  return json({
    title: clean(data.Title),
    year,
    rating,
    director: clean(data.Director),
    writer: clean(data.Writer),
    stars: clean(data.Actors),
    synopsis: clampStr(clean(data.Plot), 600),
    poster: clean(data.Poster),
  });
}
