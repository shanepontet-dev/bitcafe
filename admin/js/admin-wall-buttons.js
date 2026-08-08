// bit cafe admin: the "button wall" panel inside the webring tab --
// list, add (upload art + link), edit (metadata only), delete,
// reorder. entirely admin-managed now (js/webring.js fetches
// published rows read-only with the anon key and renders them into
// links.html's wall, which starts empty in the static HTML), and the
// newest few also show up on index.html's "a few doors out".
//
// upload flow for a new button: POST the image straight through
// /api/admin/uploads/badge (small file, no presigning needed -- see
// that route), then POST /api/admin/wall-buttons with the resulting
// key/url. mirrors admin-movies.js's poster-upload step.
import { adminFetch } from "./admin-auth.js";
import { wireDragRow, persistOrder } from "./admin-reorder.js";
import { wireImagePaste, wireImageDrop } from "./admin-paste-upload.js";

const els = {
  offline: document.getElementById("wallbtn-offline"),
  count: document.getElementById("wallbtn-count"),
  newBtn: document.getElementById("wallbtn-new-btn"),
  dropzone: document.getElementById("wallbtn-dropzone"),
  dropPreview: document.getElementById("wallbtn-drop-preview"),
  dropHint: document.getElementById("wallbtn-drop-hint"),
  form: document.getElementById("wallbtn-form"),
  formError: document.getElementById("wallbtn-form-error"),
  cancelBtn: document.getElementById("wallbtn-cancel-btn"),
  saveBtn: document.getElementById("wallbtn-save-btn"),
  empty: document.getElementById("wallbtn-empty"),
  list: document.getElementById("wallbtn-list"),
  id: document.getElementById("wallbtn-id"),
  name: document.getElementById("wallbtn-name"),
  url: document.getElementById("wallbtn-url"),
  tagline: document.getElementById("wallbtn-tagline"),
  fileField: document.getElementById("wallbtn-file-field"),
  file: document.getElementById("wallbtn-file"),
  editHint: document.getElementById("wallbtn-edit-hint"),
  published: document.getElementById("wallbtn-published"),
};

if (els.list) {
  var currentButtons = [];
  var pendingDropUpload = null; // {key, url} once a webpage-dragged image has been fetched server-side; cleared by picking a file by hand
  var dropHintDefault = els.dropHint ? els.dropHint.textContent : "";

  function resetDropzone() {
    pendingDropUpload = null;
    if (els.dropPreview) els.dropPreview.hidden = true;
    if (els.dropHint) els.dropHint.textContent = dropHintDefault;
  }

  function resetForm() {
    els.form.reset();
    els.id.value = "";
    els.published.checked = true;
    els.formError.hidden = true;
    els.saveBtn.textContent = "save button";
    resetDropzone();
  }

  function openForCreate() {
    resetForm();
    els.fileField.hidden = false;
    els.editHint.hidden = true;
    els.form.hidden = false;
    els.name.focus();
  }

  function openForEdit(button) {
    resetForm();
    els.id.value = button.id;
    els.name.value = button.site_name;
    els.url.value = button.url;
    els.tagline.value = button.tagline || "";
    els.published.checked = !!button.published;
    els.fileField.hidden = true;
    els.editHint.hidden = false;
    els.saveBtn.textContent = "update button";
    els.form.hidden = false;
    els.name.focus();
  }

  els.newBtn.addEventListener("click", openForCreate);
  els.cancelBtn.addEventListener("click", function () { els.form.hidden = true; });
  wireImagePaste(els.form, els.file, { urlInput: els.url, nameInput: els.name });

  els.file.addEventListener("change", function () {
    // a manual file choice always wins over an earlier drop
    if (els.file.files[0]) resetDropzone();
  });

  if (els.dropzone) {
    // the dropzone doubles as a click target too -- drag-and-drop has
    // no keyboard equivalent, so this is what makes it reachable
    // without a mouse (and just convenient for anyone who'd rather
    // click than drag).
    els.dropzone.addEventListener("click", function () {
      if (els.form.hidden) openForCreate();
      els.file.click();
    });
    els.dropzone.addEventListener("keydown", function (evt) {
      if (evt.key !== "Enter" && evt.key !== " ") return;
      evt.preventDefault();
      if (els.form.hidden) openForCreate();
      els.file.click();
    });

    wireImageDrop(els.dropzone, els.file, {
      urlInput: els.url,
      nameInput: els.name,
      onDrop: function () {
        if (els.form.hidden) openForCreate();
      },
      onFile: function (file) {
        pendingDropUpload = null;
        els.dropPreview.src = URL.createObjectURL(file);
        els.dropPreview.hidden = false;
        els.dropHint.textContent = "got it — check the fields below before saving.";
      },
      onNoImage: function () {
        els.dropHint.textContent = "couldn't find an image in that — try saving it and choosing the file instead.";
      },
      fetchFromUrl: async function (url) {
        els.dropHint.textContent = "fetching that image…";
        try {
          var res = await adminFetch("/api/admin/uploads/badge-from-url", {
            method: "POST",
            body: JSON.stringify({ url: url }),
          });
          if (!res.ok) throw new Error((await res.json().catch(function () { return {}; })).error || "couldn't grab that image");
          pendingDropUpload = await res.json();
          els.dropPreview.src = pendingDropUpload.url;
          els.dropPreview.hidden = false;
          els.dropHint.textContent = "got it — check the fields below before saving.";
        } catch (err) {
          els.dropHint.textContent = (err.message || "couldn't grab that image") + " — try saving it and choosing the file instead.";
        }
      },
    });
  }

  function persist() {
    persistOrder(els.list, currentButtons, function (id, index) {
      return adminFetch("/api/admin/wall-buttons/" + id, {
        method: "PATCH",
        body: JSON.stringify({ sort_order: index }),
      });
    }, function () {
      els.offline.textContent = "the new order didn't all save — reloading.";
      els.offline.hidden = false;
      load();
    });
  }

  function renderList(buttons) {
    currentButtons = buttons;
    els.count.textContent = buttons.length + (buttons.length === 1 ? " button" : " buttons");
    els.list.innerHTML = "";
    if (buttons.length === 0) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    buttons.forEach(function (button) {
      var li = document.createElement("li");
      li.className = "gb-entry";
      li.dataset.id = button.id;

      var head = document.createElement("div");
      head.className = "gb-entry-head";

      var left = document.createElement("div");
      left.className = "gb-entry-left";

      var handle = document.createElement("button");
      handle.type = "button";
      handle.className = "gb-drag-handle";
      handle.textContent = "⠿";
      handle.title = "drag to reorder (or focus and press the arrow keys)";
      handle.setAttribute("aria-label", "reorder “" + button.site_name + "” on the button wall");
      wireDragRow(li, handle, els.list, persist);

      var thumb = document.createElement("img");
      thumb.className = "gb-entry-thumb";
      thumb.src = button.image_url;
      thumb.alt = "";

      var titleEl = document.createElement("span");
      titleEl.className = "gb-entry-nick";
      titleEl.textContent = button.site_name;
      left.append(handle, thumb, titleEl);

      var stamp = document.createElement("span");
      stamp.className = "stamp small" + (button.published ? " teal" : "");
      stamp.textContent = button.published ? "live" : "draft";
      head.append(left, stamp);

      var urlLine = document.createElement("p");
      urlLine.className = "gb-entry-msg";
      urlLine.textContent = button.url + (button.tagline ? " · " + button.tagline : "");

      var actions = document.createElement("div");
      actions.className = "admin-row-actions";

      var editBtn = document.createElement("button");
      editBtn.className = "btn"; editBtn.type = "button"; editBtn.textContent = "edit";
      editBtn.addEventListener("click", function () { openForEdit(button); });

      var deleteBtn = document.createElement("button");
      deleteBtn.className = "btn"; deleteBtn.type = "button"; deleteBtn.textContent = "delete";
      deleteBtn.addEventListener("click", async function () {
        if (!window.confirm('delete the "' + button.site_name + '" button? this also removes its artwork from R2 storage.')) return;
        deleteBtn.disabled = true;
        var res = await adminFetch("/api/admin/wall-buttons/" + button.id, { method: "DELETE" });
        if (res.ok) load(); else deleteBtn.disabled = false;
      });

      actions.append(editBtn, deleteBtn);
      li.append(head, urlLine, actions);
      els.list.appendChild(li);
    });
  }

  async function load() {
    try {
      var res = await adminFetch("/api/admin/wall-buttons");
      if (!res.ok) {
        els.offline.textContent = "couldn't load the button wall.";
        els.offline.hidden = false;
        return;
      }
      els.offline.hidden = true;
      renderList(await res.json());
    } catch (err) {
      els.offline.textContent = "couldn't reach the admin backend.";
      els.offline.hidden = false;
    }
  }

  async function uploadBadgeArt(file) {
    var res = await adminFetch("/api/admin/uploads/badge", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
      },
      body: file,
    });
    if (!res.ok) {
      var data = await res.json().catch(function () { return {}; });
      throw new Error(data.error || "artwork upload failed");
    }
    return res.json();
  }

  els.form.addEventListener("submit", async function (evt) {
    evt.preventDefault();
    els.formError.hidden = true;
    els.saveBtn.disabled = true;

    var id = els.id.value;
    var metadata = {
      site_name: els.name.value.trim(),
      url: els.url.value.trim(),
      tagline: els.tagline.value.trim(),
      published: els.published.checked,
    };

    try {
      if (id) {
        var updateRes = await adminFetch("/api/admin/wall-buttons/" + id, {
          method: "PATCH",
          body: JSON.stringify(metadata),
        });
        if (!updateRes.ok) throw new Error((await updateRes.json().catch(function () { return {}; })).error || "couldn't save");
      } else {
        var imageFields;
        if (pendingDropUpload) {
          // already uploaded server-side by the drop zone (see
          // fetchFromUrl above) -- nothing left to do but use it.
          imageFields = { image_key: pendingDropUpload.key, image_url: pendingDropUpload.url };
        } else {
          var file = els.file.files[0];
          if (!file) throw new Error("pick an image file for the button art, or drag one into the drop zone above");
          els.saveBtn.textContent = "uploading…";
          var uploaded = await uploadBadgeArt(file);
          imageFields = { image_key: uploaded.key, image_url: uploaded.url };
        }

        els.saveBtn.textContent = "saving…";
        var createRes = await adminFetch("/api/admin/wall-buttons", {
          method: "POST",
          body: JSON.stringify(Object.assign({}, metadata, imageFields)),
        });
        if (!createRes.ok) throw new Error((await createRes.json().catch(function () { return {}; })).error || "couldn't save");
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
