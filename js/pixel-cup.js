// bit cafe: the pixel cup. a 9-frame hand-authored pixel-art sprite
// (img/coffee/cup-1.png … cup-9.png, full color, steam looping) swapped
// on an <img> — not canvas-drawn. this is a deliberate, documented
// exception to the house Two-Ink Rule (see DESIGN.md's Pixel Cup entry):
// one illustrated asset, not a precedent for adding color elsewhere.
// plain script, not a module: exposes window.PixelCup.
(function () {
  "use strict";

  var FRAME_COUNT = 9;
  var FRAME_MS = 120; // ~1.1s per steam loop
  var SIZE = 256;
  var PAPER = "#eef1e5";
  var REDUCED_FRAME = 5; // cup-5: a settled mid-steam pose for reduced motion

  function frameSrc(n) { return "img/coffee/cup-" + n + ".png"; }

  // frame Image objects, loaded once and reused by both the live <img>
  // swap and the export canvas (so export never re-fetches).
  var images = null;
  function loadImages() {
    if (images) return images;
    images = [];
    for (var i = 1; i <= FRAME_COUNT; i++) {
      var img = new Image();
      img.src = frameSrc(i);
      images.push(img);
    }
    return images;
  }

  function whenReady(imgs) {
    return Promise.all(imgs.map(function (img) {
      if (img.complete) return Promise.resolve();
      return new Promise(function (resolve) {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));
  }

  // ---- the live, on-page cup -------------------------------------------
  var mountedImg = null, frameIndex = 0, timerId = null, reducedMotion = false;

  function showFrame(n) {
    frameIndex = n;
    if (mountedImg) mountedImg.src = frameSrc(n);
  }

  function tick() {
    var next = (frameIndex % FRAME_COUNT) + 1;
    showFrame(next);
    timerId = setTimeout(tick, FRAME_MS);
  }

  function mount(imgEl) {
    mountedImg = imgEl;
    loadImages();
    reducedMotion = !!(window.bitcafe && window.bitcafe.prefersReducedMotion);
    if (timerId) clearTimeout(timerId);
    if (reducedMotion) {
      showFrame(REDUCED_FRAME);
    } else {
      showFrame(1);
      timerId = setTimeout(tick, FRAME_MS);
    }
  }

  // the sprite has no empty/full states (it's always a finished, steaming
  // cup), so brew progress is carried entirely by the status line and the
  // brew bar now. kept as a no-op so coffee.js's existing calls stay harmless.
  function setProgress() {}

  // ---- export: jpeg (current frame, opaque paper backing) --------------
  function download(url, filename) {
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportJPEG() {
    var imgs = loadImages();
    whenReady(imgs).then(function () {
      var off = document.createElement("canvas");
      off.width = off.height = SIZE;
      var ctx = off.getContext("2d");
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(imgs[(reducedMotion ? REDUCED_FRAME : frameIndex) - 1], 0, 0, SIZE, SIZE);
      download(off.toDataURL("image/jpeg", 0.92), "bitcafe-coffee.jpg");
    });
  }

  // ---- export: animated gif (via gif.js, loaded on demand) -------------
  // gif.js (jnordberg/gif.js, MIT) is the one external script this site
  // loads: browsers have no built-in GIF encoder. it's fetched only the
  // moment someone clicks "save as .gif", never on page load. the frames
  // themselves are just the same 9 authored PNGs, composited onto a paper
  // backing — no synthetic capture loop needed now that the art already
  // *is* the animation.
  var GIF_JS = "https://unpkg.com/gif.js@0.2.0/dist/gif.js";
  var GIF_WORKER = "https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js";
  var gifScriptPromise = null;
  var gifWorkerBlobUrlPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  // dedicated Workers can't be constructed from a cross-origin script URL
  // directly (browsers block it regardless of CORS headers), so the worker
  // source is fetched once and handed to the Worker constructor as a same-
  // origin blob: URL instead.
  function getGifWorkerBlobUrl() {
    if (!gifWorkerBlobUrlPromise) {
      gifWorkerBlobUrlPromise = fetch(GIF_WORKER)
        .then(function (r) { return r.text(); })
        .then(function (text) {
          return URL.createObjectURL(new Blob([text], { type: "application/javascript" }));
        });
    }
    return gifWorkerBlobUrlPromise;
  }

  function exportGIF(onStatus) {
    var say = onStatus || function () {};
    if (!gifScriptPromise) gifScriptPromise = loadScript(GIF_JS);
    say("loading the gif encoder…");

    var imgs = loadImages();
    return Promise.all([gifScriptPromise, getGifWorkerBlobUrl(), whenReady(imgs)]).then(function (results) {
      var workerBlobUrl = results[1];
      say("capturing frames…");
      return new Promise(function (resolve, reject) {
        var gif = new window.GIF({
          workers: 2,
          quality: 10,
          width: SIZE,
          height: SIZE,
          workerScript: workerBlobUrl,
        });

        var off = document.createElement("canvas");
        off.width = off.height = SIZE;
        var octx = off.getContext("2d");

        imgs.forEach(function (img) {
          octx.fillStyle = PAPER;
          octx.fillRect(0, 0, SIZE, SIZE);
          octx.drawImage(img, 0, 0, SIZE, SIZE);
          gif.addFrame(octx, { copy: true, delay: FRAME_MS });
        });

        say("encoding the gif…");
        gif.on("finished", function (blob) {
          download(URL.createObjectURL(blob), "bitcafe-coffee.gif");
          say("saved. check your downloads.");
          resolve();
        });
        gif.on("abort", function () { reject(new Error("gif render aborted")); });
        gif.render();
      });
    }).catch(function (err) {
      console.error("bit cafe gif export failed:", err);
      say("couldn't build the gif this time; the jpeg still works.");
      throw err;
    });
  }

  window.PixelCup = { mount: mount, setProgress: setProgress, exportJPEG: exportJPEG, exportGIF: exportGIF };
})();
