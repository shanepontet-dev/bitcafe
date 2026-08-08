// bit cafe: order digital coffee
// pure toy: nothing here is a real purchase, nothing ships, nothing
// is charged. it exists to hand you a silly printed receipt.
(function () {
  "use strict";

  var form = document.getElementById("coffee-form");
  var cupStage = document.getElementById("cup-stage");
  var pixelCupCanvas = document.getElementById("pixel-cup");
  var brewPanel = document.getElementById("brew-panel");
  var brewStatus = document.getElementById("brew-status");
  var brewBar = document.getElementById("brew-bar");
  var receiptPanel = document.getElementById("receipt-panel");
  var receiptBody = document.getElementById("receipt-body");
  var orderAgainBtn = document.getElementById("order-again");
  var submitBtn = document.getElementById("brew-submit");
  var exportJpegBtn = document.getElementById("export-jpeg");
  var exportGifBtn = document.getElementById("export-gif");
  var exportStatus = document.getElementById("export-status");

  if (!form) return;

  var cupMounted = false;
  function ensureCupMounted() {
    if (cupMounted || !pixelCupCanvas || !window.PixelCup) return;
    window.PixelCup.mount(pixelCupCanvas);
    cupMounted = true;
  }

  var BREW_STEPS = [
    "grinding bits…",
    "steaming the buffer…",
    "pulling a shot of signal…",
    "pouring over ice (theoretical)…",
    "printing your receipt…",
  ];

  var FORTUNES = [
    "you will fix the bug by simply re-reading the error message.",
    "a great username is still available. take it.",
    "somewhere, a webring is still spinning.",
    "the bug is not a bug. it is a feature you have not named yet.",
    "you will find the cable in the very last place you look. obviously.",
    "today's forecast: 80% chance of nostalgia.",
    "the download bar lies, but you already knew that.",
    "a stranger will favorite something you made this week.",
    "close twelve tabs. open one new one. repeat forever.",
    "the wifi is fine. it is the universe that is buffering.",
    "your next refresh will be smoother than this one.",
    "the guestbook has been waiting for you specifically.",
  ];

  var orderCounterKey = "bitcafe_coffee_order_no";

  function nextOrderNumber() {
    var start = 118;
    var stored = window.localStorage.getItem(orderCounterKey);
    var n = stored ? parseInt(stored, 10) + 1 : start;
    try { window.localStorage.setItem(orderCounterKey, String(n)); } catch (e) {}
    return n;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function timeStamp() {
    var d = new Date();
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" }) +
      " · " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function formatBits(n) {
    return n === 0 ? "free" : (n + (n === 1 ? " bit" : " bits"));
  }

  function selectedDrink() {
    var radio = form.querySelector('input[name="drink"]:checked');
    if (!radio) return null;
    return {
      name: radio.dataset.name,
      price: parseInt(radio.dataset.price, 10) || 0,
      note: radio.dataset.note,
    };
  }

  function runBrew(drink) {
    cupStage.hidden = false;
    ensureCupMounted();
    brewPanel.hidden = false;
    receiptPanel.hidden = true;
    if (exportStatus) exportStatus.textContent = "";
    brewPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

    var reduced = window.bitcafe && window.bitcafe.prefersReducedMotion;
    var stepMs = reduced ? 0 : 480;
    var i = 0;

    brewBar.style.setProperty("--scale", "0");
    if (window.PixelCup) window.PixelCup.setProgress(0);

    function step() {
      if (i >= BREW_STEPS.length) {
        finishBrew(drink);
        return;
      }
      brewStatus.textContent = BREW_STEPS[i];
      var progress = (i + 1) / BREW_STEPS.length;
      brewBar.style.setProperty("--scale", String(progress));
      // the cup fills a beat behind the status line, so it reads as
      // "catching up" to what's being announced rather than leading it
      if (window.PixelCup) window.PixelCup.setProgress(Math.max(0, i / BREW_STEPS.length));
      i++;
      setTimeout(step, stepMs);
    }
    step();
  }

  function finishBrew(drink) {
    brewPanel.hidden = true;
    if (window.PixelCup) window.PixelCup.setProgress(1);
    receiptPanel.hidden = false;
    receiptPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

    var orderNo = nextOrderNumber();
    var fortune = pick(FORTUNES);

    receiptBody.innerHTML = "";

    var rows = [
      ["order no.", "№ " + orderNo],
      ["item", drink.name],
      ["price", formatBits(drink.price)],
      ["printed", timeStamp()],
    ];

    rows.forEach(function (pair) {
      var row = document.createElement("div");
      row.className = "receipt-row";
      var k = document.createElement("span");
      k.textContent = pair[0];
      var v = document.createElement("span");
      v.textContent = pair[1];
      row.append(k, v);
      receiptBody.appendChild(row);
    });

    var fortuneEl = document.createElement("p");
    fortuneEl.className = "receipt-fortune";
    fortuneEl.textContent = "your fortune: " + fortune;
    receiptBody.appendChild(fortuneEl);

    var disclaimer = document.createElement("p");
    disclaimer.className = "hint";
    disclaimer.textContent = "the coffee's still fake: nothing was brewed or shipped. the bits were real, though — spent for real, right here.";
    receiptBody.appendChild(disclaimer);
  }

  form.addEventListener("submit", function (evt) {
    evt.preventDefault();
    var menuError = form.querySelector(".menu-error");
    var bitsError = form.querySelector(".bits-error");
    var drink = selectedDrink();
    if (!drink) {
      menuError.hidden = false;
      bitsError.hidden = true;
      return;
    }
    menuError.hidden = true;
    var spent = window.bitcafe && window.bitcafe.spendBits ? window.bitcafe.spendBits(drink.price) : true;
    if (!spent) {
      bitsError.hidden = false;
      return;
    }
    bitsError.hidden = true;
    submitBtn.disabled = true;
    runBrew(drink);
    setTimeout(function () { submitBtn.disabled = false; }, 2600);
  });

  if (orderAgainBtn) {
    orderAgainBtn.addEventListener("click", function () {
      receiptPanel.hidden = true;
      cupStage.hidden = true;
      if (window.PixelCup) window.PixelCup.setProgress(0);
      form.querySelectorAll('input[name="drink"]').forEach(function (r) { r.checked = false; });
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (exportJpegBtn) {
    exportJpegBtn.addEventListener("click", function () {
      if (!window.PixelCup) return;
      window.PixelCup.exportJPEG();
      if (exportStatus) exportStatus.textContent = "saved as a .jpg. check your downloads.";
    });
  }

  if (exportGifBtn) {
    exportGifBtn.addEventListener("click", function () {
      if (!window.PixelCup) return;
      exportGifBtn.disabled = true;
      exportJpegBtn.disabled = true;
      window.PixelCup.exportGIF(function (msg) {
        if (exportStatus) exportStatus.textContent = msg;
      }).finally(function () {
        exportGifBtn.disabled = false;
        exportJpegBtn.disabled = false;
      });
    });
  }
})();
