// bit cafe: shared till logic. runs on every page. no framework, no build step.
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- live register clock (footer) ----------------------------------
  function pad(n) { return String(n).padStart(2, "0"); }
  function tickClock() {
    var el = document.getElementById("clock");
    if (!el) return;
    var now = new Date();
    el.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ---- "printing" reveal: types out [data-print] elements on load -----
  // real dot-matrix printers commit a line at a time; this mirrors that
  // once, on entry, then gets out of the way. reduced-motion users see
  // the final text immediately.
  function typeOut(el) {
    var full = el.textContent;
    if (prefersReducedMotion) { el.textContent = full; return; }
    el.textContent = "";
    el.setAttribute("aria-label", full);
    var i = 0;
    var speed = Math.max(6, Math.min(22, 900 / full.length));
    (function step() {
      el.textContent = full.slice(0, i);
      i++;
      if (i <= full.length) {
        setTimeout(step, speed);
      } else {
        el.removeAttribute("aria-label");
      }
    })();
  }

  function runPrintReveal() {
    var nodes = document.querySelectorAll("[data-print]");
    nodes.forEach(function (el, idx) {
      setTimeout(function () { typeOut(el); }, idx * 90);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runPrintReveal);
  } else {
    runPrintReveal();
  }

  // ---- ticket number: a persistent, incrementing visitor number -------
  // stored locally so a return visit keeps counting up, like a real
  // till roll. this is honest about being a local counter, not a
  // server-verified total (see the live visitor count on chat.html,
  // which is the real cross-visitor number once Supabase is connected).
  function nextTicketNumber() {
    var KEY = "bitcafe_ticket_seed";
    var STARTING_NUMBER = 4821; // where the till roll happened to be when we wired this up
    var stored = window.localStorage.getItem(KEY);
    var n = stored ? parseInt(stored, 10) + 1 : STARTING_NUMBER;
    try { window.localStorage.setItem(KEY, String(n)); } catch (e) { /* private mode, fine */ }
    return n;
  }

  // exposed on window.bitcafe (below) so pages that inject new
  // [data-ticket-number] tickets after load -- movie night's screenings,
  // fetched from Supabase instead of present in the static markup --
  // can stamp just the new ones. only touches elements still showing
  // the unstamped placeholder, so calling it again after the initial
  // page-load pass never re-numbers an already-stamped ticket.
  function stampTicketNumbers(root) {
    (root || document).querySelectorAll("[data-ticket-number]").forEach(function (el) {
      if (el.textContent.trim() !== "№ ----") return;
      el.textContent = "№ " + nextTicketNumber();
    });
  }
  stampTicketNumbers();

  // ---- bits: the house currency ---------------------------------------
  // earned by fishing (fishing.html), spent at the coffee counter
  // (coffee.html). one shared balance, kept in localStorage, rendered
  // into the coin purse in the masthead on every page. everyone who
  // walks in starts with 10 — that seed only ever happens once.
  var BITS_KEY = "bitcafe_bits";
  var STARTING_BITS = 10;

  function readBits() {
    var stored = window.localStorage.getItem(BITS_KEY);
    if (stored === null) {
      try { window.localStorage.setItem(BITS_KEY, String(STARTING_BITS)); } catch (e) { /* private mode, fine */ }
      return STARTING_BITS;
    }
    var n = parseInt(stored, 10);
    return isNaN(n) ? STARTING_BITS : n;
  }

  function renderBits(n) {
    document.querySelectorAll("[data-bits-balance]").forEach(function (el) {
      el.textContent = String(n);
    });
  }

  function writeBits(n) {
    n = Math.max(0, Math.round(n));
    try { window.localStorage.setItem(BITS_KEY, String(n)); } catch (e) { /* private mode, fine */ }
    renderBits(n);
    return n;
  }

  function bumpPurse() {
    if (prefersReducedMotion) return;
    document.querySelectorAll(".coin-purse").forEach(function (el) {
      el.classList.remove("is-bumped");
      void el.offsetWidth; // restart the animation even if it's still running
      el.classList.add("is-bumped");
    });
  }

  renderBits(readBits());

  // another tab spent or earned bits: pick up the change here too
  window.addEventListener("storage", function (evt) {
    if (evt.key === BITS_KEY) renderBits(readBits());
  });

  window.bitcafe = window.bitcafe || {};
  window.bitcafe.prefersReducedMotion = prefersReducedMotion;
  window.bitcafe.pad = pad;
  window.bitcafe.stampTicketNumbers = stampTicketNumbers;
  window.bitcafe.getBits = function () { return readBits(); };
  window.bitcafe.addBits = function (n) {
    var next = writeBits(readBits() + Math.max(0, Math.round(n)));
    bumpPurse();
    return next;
  };
  window.bitcafe.spendBits = function (n) {
    n = Math.max(0, Math.round(n));
    var current = readBits();
    if (current < n) return false;
    writeBits(current - n);
    return true;
  };
})();
