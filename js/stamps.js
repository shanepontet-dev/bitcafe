// bit cafe: the stamp board. eight pixel stamps you can drag around a
// corkboard with a mouse, a finger, or the keyboard. positions are a
// local preference only -- saved in this browser's localStorage, same
// "just for you" pattern as the coin purse and ticket-number seed in
// js/common.js. there's no shared/synced board here.
(function () {
  "use strict";

  var board = document.getElementById("stamp-board");
  if (!board) return;

  var STORAGE_KEY = "bitcafe_stamp_positions";
  var STEP = 3;       // % nudge per arrow-key press
  var STEP_BIG = 8;    // % nudge with shift held

  // default scatter: a loose two-row spread with a bit of hand-pinned
  // tilt per stamp, in % of the board's own box so it holds up across
  // board sizes. also what "line them back up" restores.
  var DEFAULTS = {
    "1": { x: 14, y: 30, rot: -6 },
    "2": { x: 32, y: 18, rot: 4 },
    "3": { x: 50, y: 32, rot: -3 },
    "4": { x: 68, y: 20, rot: 7 },
    "5": { x: 86, y: 34, rot: -5 },
    "6": { x: 23, y: 70, rot: 5 },
    "7": { x: 50, y: 78, rot: -4 },
    "8": { x: 77, y: 68, rot: 6 },
  };

  var pieces = Array.prototype.slice.call(board.querySelectorAll(".stamp-piece"));

  function loadSaved() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); }
    catch (e) { /* private mode, fine -- the board just won't remember next visit */ }
  }

  var positions = loadSaved();
  pieces.forEach(function (piece) {
    var id = piece.dataset.stampId;
    if (!positions[id]) positions[id] = DEFAULTS[id];
  });

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function place(piece, pos) {
    piece.style.left = pos.x + "%";
    piece.style.top = pos.y + "%";
    piece.style.setProperty("--rot", pos.rot + "deg");
  }

  function applyAll() {
    pieces.forEach(function (piece) {
      place(piece, positions[piece.dataset.stampId]);
    });
  }
  applyAll();

  // how far (in % of the board) a piece's own half-width/half-height
  // reaches, so a drag or nudge never lets it hang off the board edge.
  function marginsFor(piece) {
    var boardRect = board.getBoundingClientRect();
    var pieceRect = piece.getBoundingClientRect();
    return {
      x: (pieceRect.width / 2 / boardRect.width) * 100,
      y: (pieceRect.height / 2 / boardRect.height) * 100,
    };
  }

  function clampToBoard(piece, x, y) {
    var m = marginsFor(piece);
    return {
      x: clamp(x, m.x, 100 - m.x),
      y: clamp(y, m.y, 100 - m.y),
    };
  }

  function pointerPercent(evt) {
    var rect = board.getBoundingClientRect();
    return {
      x: ((evt.clientX - rect.left) / rect.width) * 100,
      y: ((evt.clientY - rect.top) / rect.height) * 100,
    };
  }

  // ---- dragging: pointer events cover mouse, touch and pen alike ------
  var active = null; // { piece, id, dx, dy } -- dx/dy keep the grab point under the cursor
  var zTop = 10;

  pieces.forEach(function (piece) {
    piece.addEventListener("pointerdown", function (evt) {
      if (evt.button !== undefined && evt.button > 0) return;
      piece.setPointerCapture(evt.pointerId);
      piece.focus({ preventScroll: true });
      piece.classList.add("is-dragging");
      zTop += 1;
      piece.style.zIndex = zTop;
      var pointer = pointerPercent(evt);
      var pos = positions[piece.dataset.stampId];
      active = { piece: piece, id: piece.dataset.stampId, dx: pointer.x - pos.x, dy: pointer.y - pos.y };
      evt.preventDefault();
    });

    piece.addEventListener("pointermove", function (evt) {
      if (!active || active.piece !== piece) return;
      var pointer = pointerPercent(evt);
      var c = clampToBoard(piece, pointer.x - active.dx, pointer.y - active.dy);
      var next = { x: c.x, y: c.y, rot: positions[active.id].rot };
      positions[active.id] = next;
      place(piece, next);
    });

    function drop(evt) {
      if (!active || active.piece !== piece) return;
      piece.classList.remove("is-dragging");
      try { piece.releasePointerCapture(evt.pointerId); } catch (e) { /* already released */ }
      active = null;
      save();
    }
    piece.addEventListener("pointerup", drop);
    piece.addEventListener("pointercancel", drop);

    // ---- keyboard: focus a stamp, nudge it with the arrow keys --------
    var deltas = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    piece.addEventListener("keydown", function (evt) {
      var d = deltas[evt.key];
      if (!d) return;
      evt.preventDefault();
      var step = evt.shiftKey ? STEP_BIG : STEP;
      var pos = positions[piece.dataset.stampId];
      var c = clampToBoard(piece, pos.x + d[0] * step, pos.y + d[1] * step);
      var next = { x: c.x, y: c.y, rot: pos.rot };
      positions[piece.dataset.stampId] = next;
      place(piece, next);
      save();
    });
  });

  // ---- controls -----------------------------------------------------------
  var shuffleBtn = document.getElementById("stamp-shuffle");
  var resetBtn = document.getElementById("stamp-reset");

  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", function () {
      pieces.forEach(function (piece) {
        var pos = {
          x: 10 + Math.random() * 80,
          y: 14 + Math.random() * 72,
          rot: Math.round(Math.random() * 24 - 12),
        };
        var c = clampToBoard(piece, pos.x, pos.y);
        positions[piece.dataset.stampId] = { x: c.x, y: c.y, rot: pos.rot };
        place(piece, positions[piece.dataset.stampId]);
      });
      save();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      pieces.forEach(function (piece) {
        positions[piece.dataset.stampId] = Object.assign({}, DEFAULTS[piece.dataset.stampId]);
      });
      applyAll();
      save();
    });
  }
})();
