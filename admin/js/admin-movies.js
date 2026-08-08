// bit cafe admin: the "movie night" tab -- list + storage meter,
// add-a-screening (poster + video upload, then metadata), edit
// (metadata only -- see the note by movie-edit-hint below), delete
// (which also removes the R2 objects, freeing real quota).
//
// upload flow for a new screening:
//  1. POST /api/admin/uploads/presign -> a one-shot presigned R2 PUT
//     URL (see functions/_lib/r2.js for why: the video file is too
//     big for this Function's own request body on the Free plan).
//  2. XHR PUT the video file straight to that URL, tracking progress.
//  3. POST the poster (small) through /api/admin/uploads/poster.
//  4. POST /api/admin/movies with the resulting keys/urls -- this is
//     the only step that touches the database, so a dropped upload
//     never creates a half-written row.
//
// reordering: each row's handle is draggable (mouse) and focusable
// (arrow keys), matching movies.sort_order -- already a column, already
// sorted on by GET /api/admin/movies. a drag/keypress reorders the DOM
// immediately, then PATCHes sort_order for whichever rows actually
// moved so a slow save never fights the next drag.
//
// IMDb prefill: paste a title-page link or bare tt-id and
// GET /api/admin/movies/imdb-lookup fills the fields below from OMDb
// (see that route for why OMDb rather than scraping IMDb itself).
import { adminFetch } from "./admin-auth.js";

const els = {
  offline: document.getElementById("movies-offline"),
  count: document.getElementById("movies-count"),
  meterLabel: document.getElementById("storage-meter-label"),
  meterFill: document.getElementById("storage-meter-fill"),
  newBtn: document.getElementById("movie-new-btn"),
  form: document.getElementById("movie-form"),
  formError: document.getElementById("movie-form-error"),
  cancelBtn: document.getElementById("movie-cancel-btn"),
  saveBtn: document.getElementById("movie-save-btn"),
  empty: document.getElementById("movies-empty"),
  list: document.getElementById("movies-list"),
  id: document.getElementById("movie-id"),
  title: document.getElementById("movie-title"),
  year: document.getElementById("movie-year"),
  rating: document.getElementById("movie-rating"),
  director: document.getElementById("movie-director"),
  writer: document.getElementById("movie-writer"),
  stars: document.getElementById("movie-stars"),
  synopsis: document.getElementById("movie-synopsis"),
  posterFile: document.getElementById("movie-poster-file"),
  posterImdbHint: document.getElementById("movie-poster-imdb-hint"),
  videoSourceRadios: document.getElementsByName("movie-video-source"),
  videoFileField: document.getElementById("movie-video-file-field"),
  videoLinkField: document.getElementById("movie-video-link-field"),
  videoFile: document.getElementById("movie-video-file"),
  videoLink: document.getElementById("movie-video-link"),
  fileFields: document.getElementById("movie-file-fields"),
  editHint: document.getElementById("movie-edit-hint"),
  published: document.getElementById("movie-published"),
  progress: document.getElementById("movie-upload-progress"),
  progressFill: document.getElementById("movie-upload-fill"),
  progressLabel: document.getElementById("movie-upload-label"),
  imdbUrl: document.getElementById("movie-imdb-url"),
  imdbFetchBtn: document.getElementById("movie-imdb-fetch-btn"),
  imdbStatus: document.getElementById("movie-imdb-status"),
};

if (els.list) {
  var currentMovies = []; // kept in sync with the last render, so drag/keyboard reordering can read each row's sort_order without a re-fetch
  var draggedLi = null;
  var pendingPoster = null; // { url } from an IMDb lookup, used at save time unless a file is chosen below it

  function getVideoSource() {
    for (var i = 0; i < els.videoSourceRadios.length; i++) {
      if (els.videoSourceRadios[i].checked) return els.videoSourceRadios[i].value;
    }
    return "upload";
  }

  function updateVideoSourceUI() {
    var source = getVideoSource();
    els.videoFileField.hidden = source !== "upload";
    els.videoLinkField.hidden = source !== "link";
    els.videoFile.required = source === "upload";
    els.videoLink.required = source === "link";
  }

  for (var vsi = 0; vsi < els.videoSourceRadios.length; vsi++) {
    els.videoSourceRadios[vsi].addEventListener("change", updateVideoSourceUI);
  }

  function updatePosterImdbHint() {
    els.posterImdbHint.hidden = !pendingPoster;
    if (pendingPoster) els.posterImdbHint.textContent = "using the poster from IMDb — pick a file above to use your own instead.";
  }

  els.posterFile.addEventListener("change", function () {
    if (!els.posterFile.files[0]) return;
    pendingPoster = null;
    updatePosterImdbHint();
  });

  function formatBytes(n) {
    if (!Number.isFinite(n)) return "0 GB";
    var gb = n / (1024 * 1024 * 1024);
    return gb.toFixed(gb < 1 ? 3 : 2) + " GB";
  }

  function renderStorage(storage) {
    var pct = storage.capBytes ? Math.min(100, (storage.bytes / storage.capBytes) * 100) : 0;
    els.meterFill.style.width = pct + "%";
    els.meterFill.classList.toggle("is-hot", pct >= 80);
    els.meterLabel.textContent = formatBytes(storage.bytes) + " / " + formatBytes(storage.capBytes) +
      " (" + storage.count + (storage.count === 1 ? " file" : " files") + ")";
  }

  function resetForm() {
    els.form.reset();
    els.id.value = "";
    els.published.checked = true;
    els.formError.hidden = true;
    els.progress.hidden = true;
    els.imdbStatus.hidden = true;
    pendingPoster = null;
    updatePosterImdbHint();
    updateVideoSourceUI();
    els.saveBtn.textContent = "save screening";
  }

  function openForCreate() {
    resetForm();
    els.fileFields.hidden = false;
    els.editHint.hidden = true;
    els.form.hidden = false;
    els.title.focus();
  }

  function openForEdit(movie) {
    resetForm();
    els.id.value = movie.id;
    els.title.value = movie.title;
    els.year.value = movie.year || "";
    els.rating.value = movie.rating || "";
    els.director.value = movie.director || "";
    els.writer.value = movie.writer || "";
    els.stars.value = movie.stars || "";
    els.synopsis.value = movie.synopsis;
    els.published.checked = !!movie.published;
    els.fileFields.hidden = true;
    els.editHint.hidden = false;
    els.videoFile.required = false;
    els.videoLink.required = false;
    els.saveBtn.textContent = "update screening";
    els.form.hidden = false;
    els.title.focus();
  }

  async function doImdbLookup() {
    var raw = els.imdbUrl.value.trim();
    els.imdbStatus.hidden = false;
    if (!raw) {
      els.imdbStatus.textContent = "paste an IMDb link or id first.";
      return;
    }
    els.imdbFetchBtn.disabled = true;
    els.imdbStatus.textContent = "looking up…";
    try {
      var res = await adminFetch("/api/admin/movies/imdb-lookup?imdb=" + encodeURIComponent(raw));
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || "couldn't look that up");

      if (data.title) els.title.value = data.title;
      if (data.year) els.year.value = data.year;
      if (data.rating) els.rating.value = data.rating;
      if (data.director) els.director.value = data.director;
      if (data.writer) els.writer.value = data.writer;
      if (data.stars) els.stars.value = data.stars;
      if (data.synopsis) els.synopsis.value = data.synopsis;

      if (data.poster) pendingPoster = { url: data.poster };
      updatePosterImdbHint();

      els.imdbStatus.textContent = "filled in from IMDb — give it a once-over before saving.";
    } catch (err) {
      els.imdbStatus.hidden = true;
      els.formError.textContent = err.message || "couldn't reach the IMDb lookup.";
      els.formError.hidden = false;
    }
    els.imdbFetchBtn.disabled = false;
  }

  els.imdbFetchBtn.addEventListener("click", doImdbLookup);
  els.imdbUrl.addEventListener("keydown", function (evt) {
    // the IMDb field lives inside <form>, where Enter would otherwise
    // submit (and try to save) instead of running the lookup
    if (evt.key !== "Enter") return;
    evt.preventDefault();
    doImdbLookup();
  });

  els.newBtn.addEventListener("click", openForCreate);
  els.cancelBtn.addEventListener("click", function () { els.form.hidden = true; });

  // drag (mouse) and arrow keys (keyboard) both end up here: reorder the
  // DOM first so the list always mirrors what's on screen, then PATCH
  // sort_order for whichever rows actually moved.
  function persistOrder() {
    var ids = Array.from(els.list.children).map(function (li) { return li.dataset.id; });
    var updates = [];
    ids.forEach(function (id, index) {
      var movie = currentMovies.find(function (m) { return String(m.id) === id; });
      if (!movie || movie.sort_order === index) return;
      movie.sort_order = index;
      updates.push(adminFetch("/api/admin/movies/" + id, {
        method: "PATCH",
        body: JSON.stringify({ sort_order: index }),
      }));
    });
    if (!updates.length) return;
    Promise.all(updates).then(function (results) {
      if (results.some(function (res) { return !res.ok; })) throw new Error();
    }).catch(function () {
      els.offline.textContent = "the new order didn't all save — reloading.";
      els.offline.hidden = false;
      load();
    });
  }

  // wires a row's drag handle for both mouse drag and ArrowUp/ArrowDown.
  // draggable is toggled on only while the mouse is down on the handle
  // itself, so grabbing text or clicking edit/delete elsewhere in the
  // row never starts a drag.
  function wireDrag(li, handle) {
    li.draggable = false;
    handle.addEventListener("mousedown", function () { li.draggable = true; });
    handle.addEventListener("mouseup", function () { li.draggable = false; });

    li.addEventListener("dragstart", function (evt) {
      draggedLi = li;
      li.classList.add("is-dragging");
      evt.dataTransfer.effectAllowed = "move";
      evt.dataTransfer.setData("text/plain", li.dataset.id);
    });

    li.addEventListener("dragover", function (evt) {
      evt.preventDefault();
      if (!draggedLi || draggedLi === li) return;
      var rect = li.getBoundingClientRect();
      var before = (evt.clientY - rect.top) < rect.height / 2;
      els.list.insertBefore(draggedLi, before ? li : li.nextSibling);
    });

    li.addEventListener("drop", function (evt) { evt.preventDefault(); });

    li.addEventListener("dragend", function () {
      li.draggable = false;
      li.classList.remove("is-dragging");
      draggedLi = null;
      persistOrder();
    });

    handle.addEventListener("keydown", function (evt) {
      if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
      evt.preventDefault();
      if (evt.key === "ArrowUp") {
        var prev = li.previousElementSibling;
        if (!prev) return;
        els.list.insertBefore(li, prev);
      } else {
        var next = li.nextElementSibling;
        if (!next) return;
        els.list.insertBefore(next, li);
      }
      handle.focus();
      persistOrder();
    });
  }

  function renderList(list) {
    currentMovies = list;
    els.count.textContent = list.length + (list.length === 1 ? " screening" : " screenings");
    els.list.innerHTML = "";
    if (list.length === 0) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    list.forEach(function (movie) {
      var li = document.createElement("li");
      li.className = "gb-entry";
      li.dataset.id = movie.id;

      var head = document.createElement("div");
      head.className = "gb-entry-head";

      var left = document.createElement("div");
      left.className = "gb-entry-left";

      var handle = document.createElement("button");
      handle.type = "button";
      handle.className = "gb-drag-handle";
      handle.textContent = "⠿";
      handle.title = "drag to reorder (or focus and press the arrow keys)";
      handle.setAttribute("aria-label", "reorder “" + movie.title + "” in the lineup");
      wireDrag(li, handle);

      var titleEl = document.createElement("span");
      titleEl.className = "gb-entry-nick";
      titleEl.textContent = movie.title + (movie.year ? " (" + movie.year + ")" : "");
      left.append(handle, titleEl);

      var stamp = document.createElement("span");
      stamp.className = "stamp small" + (movie.published ? " teal" : "");
      stamp.textContent = movie.published ? "live" : "draft";
      head.append(left, stamp);

      var meta = document.createElement("p");
      meta.className = "gb-entry-msg";
      var sizeLabel = movie.video_key ? formatBytes(movie.bytes || 0) : "linked externally";
      meta.textContent = (movie.director ? "dir. " + movie.director + " · " : "") + sizeLabel;

      var actions = document.createElement("div");
      actions.className = "admin-row-actions";

      var editBtn = document.createElement("button");
      editBtn.className = "btn"; editBtn.type = "button"; editBtn.textContent = "edit";
      editBtn.addEventListener("click", function () { openForEdit(movie); });

      var deleteBtn = document.createElement("button");
      deleteBtn.className = "btn"; deleteBtn.type = "button"; deleteBtn.textContent = "delete";
      deleteBtn.addEventListener("click", async function () {
        if (!window.confirm('delete "' + movie.title + '"? this also removes the video and poster from R2 storage.')) return;
        deleteBtn.disabled = true;
        var res = await adminFetch("/api/admin/movies/" + movie.id, { method: "DELETE" });
        if (res.ok) load(); else deleteBtn.disabled = false;
      });

      actions.append(editBtn, deleteBtn);
      li.append(head, meta, actions);
      els.list.appendChild(li);
    });
  }

  async function load() {
    try {
      var res = await adminFetch("/api/admin/movies");
      if (!res.ok) {
        els.offline.textContent = "couldn't load movie night.";
        els.offline.hidden = false;
        return;
      }
      els.offline.hidden = true;
      var data = await res.json();
      renderList(data.movies || []);
      renderStorage(data.storage || { bytes: 0, count: 0, capBytes: 0 });
    } catch (err) {
      els.offline.textContent = "couldn't reach the admin backend.";
      els.offline.hidden = false;
    }
  }

  function uploadWithProgress(url, file, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      if (file.type) xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.addEventListener("progress", function (e) {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      });
      xhr.addEventListener("load", function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("video upload failed (" + xhr.status + ")"));
      });
      xhr.addEventListener("error", function () { reject(new Error("video upload failed (network error)")); });
      xhr.send(file);
    });
  }

  async function uploadPoster(file) {
    var res = await adminFetch("/api/admin/uploads/poster", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
      },
      body: file,
    });
    if (!res.ok) {
      var data = await res.json().catch(function () { return {}; });
      throw new Error(data.error || "poster upload failed");
    }
    return res.json();
  }

  function setProgress(fraction, label) {
    els.progress.hidden = false;
    els.progressFill.style.width = Math.round(fraction * 100) + "%";
    els.progressLabel.textContent = label;
  }

  els.form.addEventListener("submit", async function (evt) {
    evt.preventDefault();
    els.formError.hidden = true;
    els.saveBtn.disabled = true;

    var id = els.id.value;
    var metadata = {
      title: els.title.value.trim(),
      year: els.year.value ? parseInt(els.year.value, 10) : null,
      rating: els.rating.value.trim(),
      director: els.director.value.trim(),
      writer: els.writer.value.trim(),
      stars: els.stars.value.trim(),
      synopsis: els.synopsis.value.trim(),
      published: els.published.checked,
    };

    try {
      if (id) {
        var updateRes = await adminFetch("/api/admin/movies/" + id, {
          method: "PATCH",
          body: JSON.stringify(metadata),
        });
        if (!updateRes.ok) throw new Error((await updateRes.json().catch(function () { return {}; })).error || "couldn't save");
      } else {
        var videoFields;
        if (getVideoSource() === "link") {
          var link = els.videoLink.value.trim();
          if (!link) throw new Error('paste a video link, or switch to "upload a file"');
          setProgress(0.3, "saving…");
          videoFields = { video_key: null, video_url: link, bytes: null };
        } else {
          var videoFile = els.videoFile.files[0];
          if (!videoFile) throw new Error('pick a video file, or switch to "link to a video hosted elsewhere"');

          setProgress(0, "requesting an upload slot…");
          var presignRes = await adminFetch("/api/admin/uploads/presign", {
            method: "POST",
            body: JSON.stringify({ filename: videoFile.name }),
          });
          if (!presignRes.ok) throw new Error((await presignRes.json().catch(function () { return {}; })).error || "couldn't start the upload");
          var presign = await presignRes.json();

          await uploadWithProgress(presign.uploadUrl, videoFile, function (fraction) {
            setProgress(fraction * 0.9, "uploading video… " + Math.round(fraction * 100) + "%");
          });

          videoFields = { video_key: presign.key, video_url: presign.publicUrl, bytes: videoFile.size };
        }

        // a poster the admin picked by hand always wins; otherwise, if
        // the IMDb lookup found one, hand its URL to the server so *it*
        // fetches and stores the image (browsers can't be trusted to
        // read another site's image bytes across origins the way this
        // upload flow needs).
        var posterFile = els.posterFile.files[0];
        var posterFields = { poster_key: null, poster_url: null };
        if (posterFile) {
          setProgress(0.92, "uploading poster…");
          var poster = await uploadPoster(posterFile);
          posterFields = { poster_key: poster.key, poster_url: poster.url };
        } else if (pendingPoster) {
          posterFields = { poster_source_url: pendingPoster.url };
        }

        setProgress(0.98, "saving…");
        var createRes = await adminFetch("/api/admin/movies", {
          method: "POST",
          body: JSON.stringify(Object.assign({}, metadata, videoFields, posterFields)),
        });
        if (!createRes.ok) throw new Error((await createRes.json().catch(function () { return {}; })).error || "couldn't save");
        setProgress(1, "done.");
      }

      els.form.hidden = true;
      load();
    } catch (err) {
      els.formError.textContent = err.message || "couldn't save. try again.";
      els.formError.hidden = false;
    }

    els.saveBtn.disabled = false;
  });

  load();
}
