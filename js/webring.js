// bit cafe: the webring extras: random link + "add your site" requests.
import { supabaseConfig, isConfigured } from "./supabase-config.js";

// same pool the button wall links out to: real, verified sites only.
var RANDOM_POOL = [
  "https://melonking.net",
  "https://ribo.zone",
  "https://lostletters.neocities.org",
  "https://neocities.org",
  "https://indieweb.org",
  "https://wiby.me",
  "https://indieseek.xyz",
  "https://hotlinewebring.club",
];

(function randomLink() {
  var btn = document.getElementById("random-link-btn");
  var status = document.getElementById("random-link-status");
  if (!btn) return;

  btn.addEventListener("click", function () {
    var url = RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
    btn.disabled = true;
    if (status) status.textContent = "dialing a random corner of the web…";

    var reduced = window.bitcafe && window.bitcafe.prefersReducedMotion;
    setTimeout(function () {
      window.open(url, "_blank", "noopener");
      if (status) status.textContent = "sent you to " + url.replace(/^https?:\/\//, "") + ". opened in a new tab.";
      btn.disabled = false;
    }, reduced ? 0 : 650);
  });
})();

(function siteSubmission() {
  var form = document.getElementById("submit-form");
  var offline = document.getElementById("submit-offline");
  var confirmEl = document.getElementById("submit-confirm");
  var submitBtn = document.getElementById("submit-btn");
  if (!form) return;

  async function boot() {
    if (!isConfigured(supabaseConfig)) {
      if (offline) offline.hidden = false;
      Array.from(form.elements).forEach(function (el) { el.disabled = true; });
      return;
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

    form.addEventListener("submit", async function (evt) {
      evt.preventDefault();
      var name = form.elements["site-name"].value.trim().slice(0, 60);
      var url = form.elements["site-url"].value.trim().slice(0, 300);
      var pitch = form.elements["site-pitch"].value.trim().slice(0, 240);
      var contact = form.elements["site-contact"].value.trim().slice(0, 120);
      if (!name || !url || !pitch) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "filing…";

      var { error } = await supabase
        .from("site_submissions")
        .insert({ name: name, url: url, pitch: pitch, contact: contact, ts: Date.now() });

      if (!error) {
        form.hidden = true;
        if (confirmEl) confirmEl.hidden = false;
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = "file the request";
      }
    });
  }

  boot().catch(function (err) {
    console.error("bit cafe site-submission failed to connect:", err);
    if (offline) offline.hidden = false;
  });
})();

// the button wall -- entirely admin-uploaded now (js/admin-wall-buttons.js,
// stored in the wall_buttons table); the wall starts empty and fills in
// as buttons get added through /admin. links.html's wall shows every
// published button (data-wall-buttons="all"); index.html's "a few doors
// out" teaser shows only the newest few (data-wall-buttons="newest:N").
// both pages' <ul class="button-wall"> already exist in the static
// HTML (empty), so this only ever adds <li>s to it.
(function renderWallButtons() {
  var lists = document.querySelectorAll(".button-wall[data-wall-buttons]");
  if (!lists.length) return;

  function buildBadge(row) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = row.url;
    a.target = "_blank";
    a.rel = "noopener";
    var img = document.createElement("img");
    img.src = row.image_url;
    img.width = 88;
    img.height = 31;
    img.loading = "lazy";
    img.alt = row.site_name + (row.tagline ? " · " + row.tagline : "");
    a.appendChild(img);
    li.appendChild(a);
    return li;
  }

  function updatePoolLabel() {
    var poolLabel = document.getElementById("random-pool-count");
    if (poolLabel) poolLabel.textContent = "picks from " + RANDOM_POOL.length;
  }

  // the "empty" notices (#wall-empty, #doors-empty) are hidden by
  // default in the HTML and only ever shown here, once we actually
  // know the wall has nothing published yet -- so a page that never
  // finishes loading this script just keeps quiet rather than
  // flashing a false "empty" claim.
  async function boot() {
    if (!isConfigured(supabaseConfig)) return;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    var supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

    for (var i = 0; i < lists.length; i++) {
      var list = lists[i];
      var mode = list.dataset.wallButtons; // "all" or "newest:N"
      var staticCount = list.children.length;

      var query = supabase
        .from("wall_buttons")
        .select("site_name, url, tagline, image_url, created_at")
        .eq("published", true);

      if (mode.indexOf("newest") === 0) {
        var limit = parseInt(mode.split(":")[1], 10) || 10;
        query = query.order("created_at", { ascending: false }).limit(limit);
      } else {
        query = query.order("sort_order", { ascending: true }).order("created_at", { ascending: true });
      }

      var { data, error } = await query;
      if (error || !data) continue; // a real fetch failure -- leave this list's labels alone

      data.forEach(function (row) {
        list.appendChild(buildBadge(row));
        if (RANDOM_POOL.indexOf(row.url) === -1) RANDOM_POOL.push(row.url);
      });

      var total = staticCount + data.length;
      var emptyEl = list.parentElement.querySelector("#wall-empty, #doors-empty");
      if (emptyEl) emptyEl.hidden = total > 0;

      var wallCount = document.getElementById("wall-count");
      if (wallCount && mode === "all") wallCount.textContent = total + (total === 1 ? " door" : " doors");
      var doorsCount = document.getElementById("doors-count");
      if (doorsCount && mode.indexOf("newest") === 0 && total > 0) doorsCount.textContent = "showing " + total + " doors here.";

      updatePoolLabel();
    }
  }

  boot().catch(function (err) {
    console.error("bit cafe button wall failed to load:", err);
  });
})();

// "sites we love" admin-uploaded picks (js/admin-featured-sites.js,
// stored in the featured_sites table) -- appended after links.html's
// own hand-written coupons, same append-only spirit as the button
// wall above.
(function renderFeaturedSites() {
  var strips = document.querySelectorAll(".coupon-strip[data-featured-sites]");
  if (!strips.length) return;

  function buildCoupon(row) {
    var div = document.createElement("div");
    div.className = "coupon";
    var h3 = document.createElement("h3");
    h3.textContent = row.site_name;
    var p = document.createElement("p");
    p.textContent = row.description;
    var a = document.createElement("a");
    a.className = "btn" + (row.button_style === "red" ? " btn-red" : row.button_style === "teal" ? " btn-teal" : "");
    a.href = row.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "visit " + row.url.replace(/^https?:\/\//i, "").replace(/\/$/, "") + " →";
    div.append(h3, p, a);
    return div;
  }

  function updatePoolLabel() {
    var poolLabel = document.getElementById("random-pool-count");
    if (poolLabel) poolLabel.textContent = "picks from " + RANDOM_POOL.length;
  }

  async function boot() {
    if (!isConfigured(supabaseConfig)) return;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    var supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

    for (var i = 0; i < strips.length; i++) {
      var strip = strips[i];
      var { data, error } = await supabase
        .from("featured_sites")
        .select("site_name, url, description, button_style")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error || !data || !data.length) continue;

      data.forEach(function (row) {
        strip.appendChild(buildCoupon(row));
        if (RANDOM_POOL.indexOf(row.url) === -1) RANDOM_POOL.push(row.url);
      });

      updatePoolLabel();
    }
  }

  boot().catch(function (err) {
    console.error("bit cafe featured sites failed to load:", err);
  });
})();
