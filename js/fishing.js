// bit cafe: gone fishin'. a small, forgiving three-step loop — cast,
// reel in, take the fish — that pays out in the house currency (see
// js/common.js's window.bitcafe.addBits/spendBits). no skill gate, no
// levels, no fail state: every cast lands something. the line and
// bobber are baked into the sprite frames themselves (see css/style.css),
// so this file only ever swaps which sheet js/fishing.js is playing.
(function () {
  "use strict";

  var stage = document.getElementById("fish-stage");
  var inner = document.getElementById("fish-inner");
  var guy = document.getElementById("fish-guy");
  var statusEl = document.getElementById("fish-status");
  var controls = document.getElementById("fish-controls");
  var castBtn = document.getElementById("cast-btn");
  var reelBtn = document.getElementById("reel-btn");
  var takeBtn = document.getElementById("take-btn");
  var catchTicket = document.getElementById("catch-ticket");
  var catchIcon = document.getElementById("catch-icon");
  var catchName = document.getElementById("catch-name");
  var catchNote = document.getElementById("catch-note");
  var catchPayout = document.getElementById("catch-payout");
  var castAgainBtn = document.getElementById("cast-again-btn");
  var lifetimeEl = document.getElementById("fish-lifetime");
  var creelLog = document.getElementById("creel-log");
  var creelEmpty = document.getElementById("creel-empty");

  if (!stage || !guy) return;

  var reduced = !!(window.bitcafe && window.bitcafe.prefersReducedMotion);

  // ---- responsive scale --------------------------------------------
  // the scene is a fixed 250x250 logical box (matching background.png
  // 1:1), scaled as a whole to fit the stage's actual rendered width.
  function resize() {
    var scale = stage.clientWidth / 250;
    inner.style.setProperty("--fish-scale", String(scale));
  }
  resize();
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(stage);
  } else {
    window.addEventListener("resize", resize);
  }

  // ---- what's biting today --------------------------------------------
  // every catch gets its own icon: a two-frame sprite for the ordinary
  // ones (frameW/H is one frame; sheetW/H is the full source png), and
  // the golden fish as the one rare pull with a bigger, five-frame icon.
  var COMMON_CATCHES = [
    { name: "packet minnow",     note: "small enough to lose in the noise. still counts.", bits: 1, file: "catch-1.png", frameW: 12, frameH: 6,  sheetW: 24,  sheetH: 6 },
    { name: "cache trout",       note: "you've caught this exact fish before. probably.", bits: 1, file: "catch-2.png", frameW: 16, frameH: 12, sheetW: 32,  sheetH: 12 },
    { name: "dial-up carp",      note: "slow to bite. worth the wait.", bits: 1, file: "catch-3.png", frameW: 20, frameH: 12, sheetW: 40,  sheetH: 12 },
    { name: "buffer bass",       note: "kept you waiting, then showed up fine.", bits: 2, file: "catch-4.png", frameW: 26, frameH: 12, sheetW: 52,  sheetH: 12 },
    { name: "cookie shrimp",     note: "was tracking you before you caught it.", bits: 2, file: "catch-5.png", frameW: 28, frameH: 24, sheetW: 56,  sheetH: 24 },
    { name: "broadband salmon",  note: "upstream the whole way, somehow still fast.", bits: 2, file: "catch-7.png", frameW: 30, frameH: 12, sheetW: 60,  sheetH: 12 },
    { name: "spyware sunfish",   note: "was already watching you before you cast.", bits: 2, file: "catch-8.png", frameW: 30, frameH: 12, sheetW: 60,  sheetH: 12 },
    { name: "buffering shark",   note: "still loading. showed up anyway.", bits: 3, file: "catch-6.png", frameW: 54, frameH: 22, sheetW: 108, sheetH: 22 }
  ];
  var GOLDEN_CATCH = { name: "premium-tier goldfish", note: "fletcher doesn't know how it got in the till. pays out anyway.", bits: 5, golden: true };
  var GOLDEN_ODDS = 0.12;

  function pickCatch() {
    if (Math.random() < GOLDEN_ODDS) return GOLDEN_CATCH;
    return COMMON_CATCHES[Math.floor(Math.random() * COMMON_CATCHES.length)];
  }

  // sizes each catch icon up to a legible, roughly consistent footprint
  // regardless of its native sprite dimensions, and points the shared
  // two-frame flip loop (see css/style.css) at that instance's width.
  function renderIcon(entry) {
    if (entry.golden) {
      catchIcon.className = "catch-icon catch-icon--golden";
      ["width", "height", "background-image", "background-size", "background-position", "--catch-flip-end"]
        .forEach(function (p) { catchIcon.style.removeProperty(p); });
      return;
    }
    var scale = Math.max(3, Math.min(9, Math.round(60 / Math.max(entry.frameW, entry.frameH))));
    catchIcon.className = "catch-icon catch-icon--flip2";
    catchIcon.style.width = (entry.frameW * scale) + "px";
    catchIcon.style.height = (entry.frameH * scale) + "px";
    catchIcon.style.backgroundImage = "url('img/fishing/" + entry.file + "')";
    catchIcon.style.backgroundSize = (entry.sheetW * scale) + "px " + (entry.sheetH * scale) + "px";
    catchIcon.style.backgroundPosition = "0 0";
    catchIcon.style.setProperty("--catch-flip-end", "-" + (entry.frameW * scale) + "px");
  }

  // ---- lifetime counter (persisted, like the coffee order number) ----
  var LIFETIME_KEY = "bitcafe_fish_lifetime";
  function readLifetime() {
    var n = parseInt(window.localStorage.getItem(LIFETIME_KEY), 10);
    return isNaN(n) ? 0 : n;
  }
  function writeLifetime(n) {
    try { window.localStorage.setItem(LIFETIME_KEY, String(n)); } catch (e) { /* private mode, fine */ }
    lifetimeEl.textContent = String(n);
  }
  writeLifetime(readLifetime());

  function logCatch(entry) {
    creelEmpty.hidden = true;
    var li = document.createElement("li");
    li.className = "creel-item";
    var label = document.createElement("span");
    label.textContent = entry.name;
    var bits = document.createElement("span");
    bits.className = "bits";
    bits.textContent = "+" + entry.bits + (entry.bits === 1 ? " bit" : " bits");
    li.append(label, bits);
    creelLog.insertBefore(li, creelLog.firstChild);
  }

  // ---- state machine ---------------------------------------------------
  var state = "idle"; // idle | casting | waiting | bite | reeling | hooked | showing
  var biteTimer = null;

  function setGuy(mode) { guy.className = "fish-guy fish-guy--" + mode; }

  function goIdle() {
    state = "idle";
    setGuy("idle");
    statusEl.textContent = "the line's dry. cast when you're ready.";
    statusEl.classList.remove("is-bite");
    castBtn.hidden = false; castBtn.disabled = false;
    reelBtn.hidden = true;
    takeBtn.hidden = true;
  }

  function startCast() {
    if (state !== "idle") return;
    state = "casting";
    setGuy("cast");
    castBtn.disabled = true;
    statusEl.textContent = "casting…";
    setTimeout(startWaiting, reduced ? 0 : 800);
  }

  function startWaiting() {
    state = "waiting";
    setGuy("waiting");
    statusEl.textContent = "waiting for a bite…";
    var wait = reduced ? 250 : (1100 + Math.random() * 1500);
    biteTimer = setTimeout(startBite, wait);
  }

  function startBite() {
    if (state !== "waiting") return;
    state = "bite";
    statusEl.textContent = "something's on the line!";
    statusEl.classList.add("is-bite");
    castBtn.hidden = true;
    reelBtn.hidden = false;
    reelBtn.disabled = false;
  }

  function startReel() {
    if (state !== "bite") return;
    state = "reeling";
    setGuy("reel");
    reelBtn.disabled = true;
    statusEl.textContent = "reeling it in…";
    statusEl.classList.remove("is-bite");
    setTimeout(function () {
      state = "hooked";
      setGuy("waiting");
      statusEl.textContent = "you've got something — take a look.";
      reelBtn.hidden = true;
      takeBtn.hidden = false;
      takeBtn.disabled = false;
    }, reduced ? 0 : 800);
  }

  function takeFish() {
    if (state !== "hooked") return;
    var caught = pickCatch();
    if (window.bitcafe && window.bitcafe.addBits) window.bitcafe.addBits(caught.bits);
    writeLifetime(readLifetime() + 1);
    logCatch(caught);

    setGuy("catch");
    renderIcon(caught);
    catchName.textContent = caught.name;
    catchNote.textContent = caught.note;
    catchPayout.textContent = "+" + caught.bits + (caught.bits === 1 ? " bit" : " bits");
    catchTicket.hidden = false;
    catchTicket.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });

    state = "showing";
    controls.hidden = true;
    statusEl.textContent = "";
  }

  castBtn.addEventListener("click", startCast);
  reelBtn.addEventListener("click", startReel);
  takeBtn.addEventListener("click", takeFish);
  if (castAgainBtn) {
    castAgainBtn.addEventListener("click", function () {
      catchTicket.hidden = true;
      controls.hidden = false;
      goIdle();
    });
  }

  goIdle();
})();
