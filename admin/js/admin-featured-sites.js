// bit cafe admin: the "sites we love" panel inside the webring tab --
// list, add, edit, delete, reorder. links.html's coupon strip keeps
// its own hand-written picks in the page's markup; rows managed here
// (js/webring.js, fetched read-only with the anon key) are appended
// after those, never replacing them.
import { adminFetch } from "./admin-auth.js";
import { wireDragRow, persistOrder } from "./admin-reorder.js";

const els = {
  offline: document.getElementById("featured-offline"),
  count: document.getElementById("featured-count"),
  newBtn: document.getElementById("featured-new-btn"),
  form: document.getElementById("featured-form"),
  formError: document.getElementById("featured-form-error"),
  cancelBtn: document.getElementById("featured-cancel-btn"),
  saveBtn: document.getElementById("featured-save-btn"),
  empty: document.getElementById("featured-empty"),
  list: document.getElementById("featured-list"),
  id: document.getElementById("featured-id"),
  name: document.getElementById("featured-name"),
  url: document.getElementById("featured-url"),
  description: document.getElementById("featured-description"),
  style: document.getElementById("featured-style"),
  published: document.getElementById("featured-published"),
};

if (els.list) {
  var currentSites = [];

  function resetForm() {
    els.form.reset();
    els.id.value = "";
    els.published.checked = true;
    els.formError.hidden = true;
    els.saveBtn.textContent = "save site";
  }

  function openForCreate() {
    resetForm();
    els.form.hidden = false;
    els.name.focus();
  }

  function openForEdit(site) {
    resetForm();
    els.id.value = site.id;
    els.name.value = site.site_name;
    els.url.value = site.url;
    els.description.value = site.description;
    els.style.value = site.button_style || "default";
    els.published.checked = !!site.published;
    els.saveBtn.textContent = "update site";
    els.form.hidden = false;
    els.name.focus();
  }

  els.newBtn.addEventListener("click", openForCreate);
  els.cancelBtn.addEventListener("click", function () { els.form.hidden = true; });

  function persist() {
    persistOrder(els.list, currentSites, function (id, index) {
      return adminFetch("/api/admin/featured-sites/" + id, {
        method: "PATCH",
        body: JSON.stringify({ sort_order: index }),
      });
    }, function () {
      els.offline.textContent = "the new order didn't all save — reloading.";
      els.offline.hidden = false;
      load();
    });
  }

  function renderList(sites) {
    currentSites = sites;
    els.count.textContent = sites.length + (sites.length === 1 ? " site" : " sites");
    els.list.innerHTML = "";
    if (sites.length === 0) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    sites.forEach(function (site) {
      var li = document.createElement("li");
      li.className = "gb-entry";
      li.dataset.id = site.id;

      var head = document.createElement("div");
      head.className = "gb-entry-head";

      var left = document.createElement("div");
      left.className = "gb-entry-left";

      var handle = document.createElement("button");
      handle.type = "button";
      handle.className = "gb-drag-handle";
      handle.textContent = "⠿";
      handle.title = "drag to reorder (or focus and press the arrow keys)";
      handle.setAttribute("aria-label", "reorder “" + site.site_name + "” in the coupon strip");
      wireDragRow(li, handle, els.list, persist);

      var titleEl = document.createElement("span");
      titleEl.className = "gb-entry-nick";
      titleEl.textContent = site.site_name + " (" + site.button_style + ")";
      left.append(handle, titleEl);

      var stamp = document.createElement("span");
      stamp.className = "stamp small" + (site.published ? " teal" : "");
      stamp.textContent = site.published ? "live" : "draft";
      head.append(left, stamp);

      var desc = document.createElement("p");
      desc.className = "gb-entry-msg";
      desc.textContent = site.description;

      var urlLine = document.createElement("p");
      urlLine.className = "hint";
      urlLine.textContent = site.url;

      var actions = document.createElement("div");
      actions.className = "admin-row-actions";

      var editBtn = document.createElement("button");
      editBtn.className = "btn"; editBtn.type = "button"; editBtn.textContent = "edit";
      editBtn.addEventListener("click", function () { openForEdit(site); });

      var deleteBtn = document.createElement("button");
      deleteBtn.className = "btn"; deleteBtn.type = "button"; deleteBtn.textContent = "delete";
      deleteBtn.addEventListener("click", async function () {
        if (!window.confirm('remove "' + site.site_name + '" from the coupon strip?')) return;
        deleteBtn.disabled = true;
        var res = await adminFetch("/api/admin/featured-sites/" + site.id, { method: "DELETE" });
        if (res.ok) load(); else deleteBtn.disabled = false;
      });

      actions.append(editBtn, deleteBtn);
      li.append(head, desc, urlLine, actions);
      els.list.appendChild(li);
    });
  }

  async function load() {
    try {
      var res = await adminFetch("/api/admin/featured-sites");
      if (!res.ok) {
        els.offline.textContent = "couldn't load sites we love.";
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

  els.form.addEventListener("submit", async function (evt) {
    evt.preventDefault();
    els.formError.hidden = true;
    els.saveBtn.disabled = true;

    var body = {
      site_name: els.name.value.trim(),
      url: els.url.value.trim(),
      description: els.description.value.trim(),
      button_style: els.style.value,
      published: els.published.checked,
    };

    var id = els.id.value;
    var res = id
      ? await adminFetch("/api/admin/featured-sites/" + id, { method: "PATCH", body: JSON.stringify(body) })
      : await adminFetch("/api/admin/featured-sites", { method: "POST", body: JSON.stringify(body) });

    if (res.ok) {
      els.form.hidden = true;
      load();
    } else {
      var data = await res.json().catch(function () { return {}; });
      els.formError.textContent = data.error || "couldn't save. try again.";
      els.formError.hidden = false;
    }
    els.saveBtn.disabled = false;
  });

  load();
}
