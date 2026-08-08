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
