// bit cafe: movie night. supports any number of screenings on the page —
// each is a self-contained block (see movie-night.html's comment) with its
// own <video data-src="media/whatever.mp4">. for each one found, this
// tries to actually load the file and watches the video element's own
// loadedmetadata/error events to tell whether it exists, so a missing
// file reads as an honest "not loaded yet" notice instead of a broken
// embed — and wires up its own skip/speed controls once it's playable.
//
// this used to check first with fetch(src, {method:"HEAD"}), which works
// when the site is served over http(s) but silently fails every time on
// file:// (the scheme you get from just double-clicking the html file):
// browsers block the Fetch API entirely on file://, so every screening
// looked "not loaded" even with a good file sitting right there. loading
// the <video>/<source> directly and listening to its own events works
// under both, so that's the only path now.
(function () {
  "use strict";

  document.querySelectorAll("video[data-src]").forEach(function (video) {
    var src = video.getAttribute("data-src");
    var col = video.closest(".screening-col");
    if (!col) return;

    var fallback = col.querySelector(".notice.offline");
    var controls = col.querySelector(".screening-controls");
    var speedBtn = controls ? controls.querySelector("[data-speed-btn]") : null;

    // the file has no separate subtitle/caption track by default — this
    // just makes sure that stays true even if a future file swap adds
    // one, in browsers that expose embedded text tracks.
    function disableTextTracks() {
      var tracks = video.textTracks;
      if (!tracks) return;
      for (var i = 0; i < tracks.length; i++) {
        tracks[i].mode = "disabled";
      }
    }
    video.addEventListener("loadedmetadata", disableTextTracks);
    if (video.textTracks) {
      video.textTracks.addEventListener("addtrack", disableTextTracks);
    }

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
        if (btn.hasAttribute("data-skip")) {
          skip(parseFloat(btn.getAttribute("data-skip")));
        } else if (btn.hasAttribute("data-speed-btn")) {
          setSpeed(speedIndex + 1);
        }
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
      // fallback notice is visible by default in the markup; nothing to do
    }
    video.addEventListener("loadedmetadata", onReady);
    // capture phase: a failed <source> fires "error" on itself, which
    // doesn't bubble, but a capturing listener on an ancestor still sees it
    video.addEventListener("error", onFail, true);

    var source = document.createElement("source");
    source.src = src;
    source.type = "video/mp4";
    video.appendChild(source);
    video.load();
  });
})();
