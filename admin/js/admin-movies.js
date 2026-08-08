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
  videoFile: document.getElementById("movie-video-file"),
  fileFields: document.getElementById("movie-file-fields"),
  editHint: document.getElementById("movie-edit-hint"),
  published: document.getElementById("movie-published"),
  progress: document.getElementById("movie-upload-progress"),
  progressFill: document.getElementById("movie-upload-fill"),
  progressLabel: document.getElementById("movie-upload-label"),
};

if (els.list) {
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
    els.saveBtn.textContent = "save screening";
  }

  function openForCreate() {
    resetForm();
    els.fileFields.hidden = false;
    els.editHint.hidden = true;
    els.videoFile.required = true;
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
    els.saveBtn.textContent = "update screening";
    els.form.hidden = false;
    els.title.focus();
  }

  els.newBtn.addEventListener("click", openForCreate);
  els.cancelBtn.addEventListener("click", function () { els.form.hidden = true; });

  function renderList(movies) {
    els.count.textContent = movies.length + (movies.length === 1 ? " screening" : " screenings");
    els.list.innerHTML = "";
    if (movies.length === 0) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    movies.forEach(function (movie) {
      var li = document.createElement("li");
      li.className = "gb-entry";

      var head = document.createElement("div");
      head.className = "gb-entry-head";
      var titleEl = document.createElement("span");
      titleEl.className = "gb-entry-nick";
      titleEl.textContent = movie.title + (movie.year ? " (" + movie.year + ")" : "");
      var stamp = document.createElement("span");
      stamp.className = "stamp small" + (movie.published ? " teal" : "");
      stamp.textContent = movie.published ? "live" : "draft";
      head.append(titleEl, stamp);

      var meta = document.createElement("p");
      meta.className = "gb-entry-msg";
      meta.textContent = (movie.director ? "dir. " + movie.director + " · " : "") + formatBytes(movie.bytes || 0);

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
        var videoFile = els.videoFile.files[0];
        if (!videoFile) throw new Error("pick a video file");

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

        var posterFile = els.posterFile.files[0];
        var poster = null;
        if (posterFile) {
          setProgress(0.92, "uploading poster…");
          poster = await uploadPoster(posterFile);
        }

        setProgress(0.98, "saving…");
        var createRes = await adminFetch("/api/admin/movies", {
          method: "POST",
          body: JSON.stringify(Object.assign({}, metadata, {
            video_key: presign.key,
            video_url: presign.publicUrl,
            bytes: videoFile.size,
            poster_key: poster ? poster.key : null,
            poster_url: poster ? poster.url : null,
          })),
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
