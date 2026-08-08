// bit cafe: movie night. screenings are admin-authored content
// (title/poster/stats/synopsis/video) fetched read-only from Supabase
// with the anon key -- RLS only exposes published=true rows (see
// supabase/002_articles_movies.sql). the admin panel (/admin) is the
// only way to add or remove a screening now: it uploads the video to
// R2 and writes the row this page reads.
//
// this file does two jobs: build the same .ticket markup a
// hand-edited screening block used to be, one per row from Supabase;
// then wire each rendered <video> up exactly the way the old
// static-markup version of this file did -- loading the <source>
// directly and watching the video element's own loadedmetadata/error
// events (not fetch/HEAD, which silently fails on file://) to tell
// whether the reel is actually playable.
import { supabaseConfig, isConfigured } from "./supabase-config.js";

async function getSupabase() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  return createClient(supabaseConfig.url, supabaseConfig.anonKey);
}

function el(tag, className, text) {
  var e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

function buildStat(label, value) {
  var row = el("div", "movie-stat");
  row.appendChild(el("dt", null, label));
  row.appendChild(el("dd", null, value));
  return row;
}

function buildScreening(movie) {
  var ticket = el("div", "ticket ticket-torn");
  ticket.style.maxWidth = "50rem";
  ticket.style.marginLeft = "auto";
  ticket.style.marginRight = "auto";

  var head = el("div", "ticket-head");
  head.appendChild(el("span", null, "now screening: " + movie.title + (movie.year ? " (" + movie.year + ")" : "")));
  var ticketNo = el("span", null, "№ ----");
  ticketNo.setAttribute("data-ticket-number", "");
  head.appendChild(ticketNo);
  ticket.appendChild(head);

  var row = el("div", "screening-row");

  var col = el("div", "screening-col");
  var frame = el("div", "screening-frame");
  var video = document.createElement("video");
  video.className = "screening-video";
  video.setAttribute("data-src", movie.video_url);
  video.controls = true;
  video.loop = true;
  video.hidden = true;
  var fallback = el("div", "notice offline");
  fallback.appendChild(el("strong", null, "the reel isn't playing."));
  fallback.appendChild(document.createTextNode(" the file may still be uploading, or the link's gone stale — check back soon."));
  frame.append(video, fallback);

  var controls = el("div", "screening-controls");
  controls.hidden = true;
  var back30 = el("button", "btn", "« 30s"); back30.type = "button"; back30.setAttribute("data-skip", "-30");
  var fwd30 = el("button", "btn", "30s »"); fwd30.type = "button"; fwd30.setAttribute("data-skip", "30");
  var speedBtn = el("button", "btn btn-teal", "1×"); speedBtn.type = "button"; speedBtn.setAttribute("data-speed-btn", "");
  controls.append(back30, fwd30, speedBtn);
  col.append(frame, controls);

  var posterFrame = el("div", "poster-frame");
  if (movie.poster_url) {
    var img = document.createElement("img");
    img.className = "poster-img";
    img.src = movie.poster_url;
    img.alt = "the poster for " + movie.title + ", tacked up by the door";
    posterFrame.appendChild(img);
  }
  var stats = el("dl", "movie-stats");
  if (movie.rating) stats.appendChild(buildStat("rating", movie.rating));
  if (movie.director) stats.appendChild(buildStat("director", movie.director));
  if (movie.writer) stats.appendChild(buildStat("writer", movie.writer));
  if (movie.stars) stats.appendChild(buildStat("stars", movie.stars));
  posterFrame.appendChild(stats);

  row.append(col, posterFrame);
  ticket.appendChild(row);
  ticket.appendChild(el("hr", "tearline"));
  ticket.appendChild(el("p", null, movie.synopsis));

  return { ticket: ticket, video: video, fallback: fallback, controls: controls, speedBtn: speedBtn };
}

// unchanged in spirit from the pre-Supabase version of this file --
// see the comment on boot() above for why this doesn't use fetch/HEAD.
function wireVideo(parts) {
  var video = parts.video;
  var fallback = parts.fallback;
  var controls = parts.controls;
  var speedBtn = parts.speedBtn;

  function disableTextTracks() {
    var tracks = video.textTracks;
    if (!tracks) return;
    for (var i = 0; i < tracks.length; i++) tracks[i].mode = "disabled";
  }
  video.addEventListener("loadedmetadata", disableTextTracks);
  if (video.textTracks) video.textTracks.addEventListener("addtrack", disableTextTracks);

  var SPEEDS = [1, 1.5, 2, 4];
  var speedIndex = 0;
  function setSpeed(index) {
    speedIndex = ((index % SPEEDS.length) + SPEEDS.length) % SPEEDS.length;
    video.playbackRate = SPEEDS[speedIndex];
    if (speedBtn) speedBtn.textContent = SPEEDS[speedIndex] + "×";
  }

  function skip(seconds) {
    if (!isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + seconds), video.duration);
  }

  if (controls) {
    controls.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      if (btn.hasAttribute("data-skip")) skip(parseFloat(btn.getAttribute("data-skip")));
      else if (btn.hasAttribute("data-speed-btn")) setSpeed(speedIndex + 1);
    });
  }

  function onReady() {
    video.removeEventListener("loadedmetadata", onReady);
    video.removeEventListener("error", onFail, true);
    video.hidden = false;
    if (fallback) fallback.hidden = true;
    if (controls) controls.hidden = false;
  }
  function onFail() {
    video.removeEventListener("loadedmetadata", onReady);
    video.removeEventListener("error", onFail, true);
    // fallback notice is visible by default; nothing else to do
  }
  video.addEventListener("loadedmetadata", onReady);
  // capture phase: a failed <source> fires "error" on itself, which
  // doesn't bubble, but a capturing listener on an ancestor still sees it
  video.addEventListener("error", onFail, true);

  var source = document.createElement("source");
  source.src = video.getAttribute("data-src");
  source.type = "video/mp4";
  video.appendChild(source);
  video.load();
}

async function boot() {
  var list = document.getElementById("screenings-list");
  if (!list) return;
  var offline = document.getElementById("screenings-offline");
  var empty = document.getElementById("screenings-empty");

  if (!isConfigured(supabaseConfig)) {
    if (offline) offline.hidden = false;
    return;
  }

  var supabase = await getSupabase();
  var { data, error } = await supabase
    .from("movies")
    .select("title, year, rating, director, writer, stars, synopsis, poster_url, video_url")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  var movies = data || [];
  if (movies.length === 0) {
    if (empty) empty.hidden = false;
    return;
  }

  movies.forEach(function (movie) {
    var parts = buildScreening(movie);
    list.appendChild(parts.ticket);
    wireVideo(parts);
  });

  // js/common.js already ran its normal load-time pass before this
  // async fetch resolved, so the ticket numbers on the screenings we
  // just added are still unstamped -- ask it to fill in just those.
  if (window.bitcafe && typeof window.bitcafe.stampTicketNumbers === "function") {
    window.bitcafe.stampTicketNumbers(list);
  }
}

boot().catch(function (err) {
  console.error("bit cafe movie night failed to load:", err);
  var offline = document.getElementById("screenings-offline");
  if (offline) offline.hidden = false;
});
