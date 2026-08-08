// bit cafe: the pixel cup. a hand-mapped 28x28 sprite, drawn on canvas,
// in the house ink/paper/red palette (no new colors: see DESIGN.md's
// Two-Ink Rule). plain script, not a module: exposes window.PixelCup.
(function () {
  "use strict";

  var COLS = 28, ROWS = 28, CELL = 6; // 168x168 logical canvas

  var INK = "#201f19";
  var PAPER = "#eef1e5";
  var RED = "#b31f28";
  var STEAM = "#b9bba4";

  // ---- static cup mask ----------------------------------------------
  // the body is a rounded-rect stair-stepped at the bottom (classic
  // pixel-art corner rounding), a rectangular loop handle flush to the
  // right wall, and a two-step flat saucer.
  function bodyRowRange(row) {
    if (row >= 8 && row <= 17) return [6, 21];
    if (row === 18) return [7, 20];
    if (row === 19) return [8, 19];
    if (row === 20) return [9, 18];
    return null;
  }

  function cellKind(col, row) {
    var range = bodyRowRange(row);
    if (range) {
      var lo = range[0], hi = range[1];
      if (col >= lo && col <= hi) {
        if (row === 8 || row === 20) return "k"; // rim + floor, fully outlined
        if (col === lo || col === hi) return "k"; // walls
        return "i"; // interior: paper or fill
      }
    }
    if (col >= 21 && col <= 24 && row >= 12 && row <= 16) {
      var inner = col >= 22 && col <= 23 && row >= 13 && row <= 15;
      if (!inner) return "h";
    }
    if (row === 21 && col >= 7 && col <= 20) return "s";
    if (row === 22 && col >= 4 && col <= 23) return "s";
    return null;
  }

  // interior rows, bottom-first, for the liquid level
  var INTERIOR_ROWS = [19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9];

  function isFilled(col, row, progress) {
    var idx = INTERIOR_ROWS.indexOf(row);
    if (idx === -1) return false;
    var filledCount = Math.round(progress * INTERIOR_ROWS.length);
    return idx < filledCount;
  }

  // ---- one renderer instance = its own steam particles ----------------
  // kept per-instance so the live on-page cup and an export capture never
  // fight over the same particle state.
  function createRenderer() {
    var particles = [];
    var lastSpawn = -Infinity;
    var ORIGIN_COLS = [11, 13, 16, 18];

    function spawn(now) {
      var gx = ORIGIN_COLS[Math.floor(Math.random() * ORIGIN_COLS.length)] + (Math.random() - 0.5);
      particles.push({ gx: gx, born: now, driftSeed: Math.random() * 10 });
    }

    function update(now, reduced) {
      if (reduced) return;
      if (now - lastSpawn > 260) { spawn(now); lastSpawn = now; }
      particles = particles.filter(function (p) { return now - p.born < 1800; });
      particles.forEach(function (p) {
        p.gx += Math.sin((now - p.born) / 220 + p.driftSeed) * 0.02;
      });
    }

    function drawSteam(ctx, now, reduced) {
      ctx.fillStyle = STEAM;
      if (reduced) {
        [[11, 5], [13, 3], [16, 4], [18, 6]].forEach(function (p) {
          ctx.globalAlpha = 0.6;
          ctx.fillRect(p[0] * CELL, p[1] * CELL, CELL, CELL);
        });
        ctx.globalAlpha = 1;
        return;
      }
      particles.forEach(function (p) {
        var age = (now - p.born) / 1800;
        var gy = 7.5 - age * 7.5;
        ctx.globalAlpha = Math.max(0, 1 - age) * 0.8;
        ctx.fillRect(Math.round(p.gx) * CELL, Math.round(gy) * CELL, CELL, CELL);
      });
      ctx.globalAlpha = 1;
    }

    function draw(ctx, progress, now, reduced, bg) {
      ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
      }
      for (var row = 0; row < ROWS; row++) {
        for (var col = 0; col < COLS; col++) {
          var kind = cellKind(col, row);
          if (!kind) continue;
          ctx.fillStyle = kind === "i" ? (isFilled(col, row, progress) ? RED : PAPER) : INK;
          ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
        }
      }
      drawSteam(ctx, now, reduced);
    }

    return {
      update: update,
      draw: draw,
      reset: function () { particles = []; lastSpawn = -Infinity; },
    };
  }

  // ---- the live, on-page cup -------------------------------------------
  var live = createRenderer();
  var mountedCtx = null, currentProgress = 0, rafId = null, reducedMotion = false;

  function loop(now) {
    live.update(now, reducedMotion);
    live.draw(mountedCtx, currentProgress, now, reducedMotion, null);
    rafId = requestAnimationFrame(loop);
  }

  function mount(canvas) {
    mountedCtx = canvas.getContext("2d");
    reducedMotion = !!(window.bitcafe && window.bitcafe.prefersReducedMotion);
    live.reset();
    if (rafId) cancelAnimationFrame(rafId);
    if (reducedMotion) {
      live.draw(mountedCtx, currentProgress, 0, true, null);
    } else {
      rafId = requestAnimationFrame(loop);
    }
  }

  function setProgress(p) {
    currentProgress = Math.max(0, Math.min(1, p));
    if (reducedMotion && mountedCtx) live.draw(mountedCtx, currentProgress, 0, true, null);
  }

  // ---- export: jpeg (one static frame, opaque paper backing) -----------
  function download(url, filename) {
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportJPEG() {
    var off = document.createElement("canvas");
    off.width = COLS * CELL;
    off.height = ROWS * CELL;
    var snap = createRenderer();
    snap.draw(off.getContext("2d"), currentProgress, performance.now(), true, PAPER);
    download(off.toDataURL("image/jpeg", 0.92), "bitcafe-coffee.jpg");
  }

  // ---- export: animated gif (via gif.js, loaded on demand) -------------
  // gif.js (jnordberg/gif.js, MIT) is the one external script this site
  // loads: browsers have no built-in GIF encoder. it's fetched only the
  // moment someone clicks "save as .gif", never on page load.
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

    return Promise.all([gifScriptPromise, getGifWorkerBlobUrl()]).then(function (results) {
      var workerBlobUrl = results[1];
      say("capturing frames…");
      return new Promise(function (resolve, reject) {
        var gif = new window.GIF({
          workers: 2,
          quality: 10,
          width: COLS * CELL,
          height: ROWS * CELL,
          workerScript: workerBlobUrl,
        });

        var off = document.createElement("canvas");
        off.width = COLS * CELL;
        off.height = ROWS * CELL;
        var octx = off.getContext("2d");
        var capture = createRenderer();

        var frames = 24, delay = 70, i = 0;
        var start = performance.now();

        function step() {
          var t = start + i * delay;
          capture.update(t, false);
          capture.draw(octx, currentProgress, t, false, PAPER);
          gif.addFrame(octx, { copy: true, delay: delay });
          i++;
          if (i < frames) {
            setTimeout(step, 0);
          } else {
            say("encoding the gif…");
            gif.on("finished", function (blob) {
              download(URL.createObjectURL(blob), "bitcafe-coffee.gif");
              say("saved. check your downloads.");
              resolve();
            });
            gif.render();
          }
        }
        step();
      });
    }).catch(function (err) {
      console.error("bit cafe gif export failed:", err);
      say("couldn't build the gif this time; the jpeg still works.");
      throw err;
    });
  }

  window.PixelCup = { mount: mount, setProgress: setProgress, exportJPEG: exportJPEG, exportGIF: exportGIF };
})();
