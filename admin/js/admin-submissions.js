// bit cafe admin: the "wall requests" tab -- a read-only list of
// site_submissions (the webring's "request a spot" form) with a
// dismiss button. no auto-publish to the button wall on links.html --
// that's still a deliberate hand-edit, same as README.md documents;
// this just replaces "read them in the Supabase Table Editor" with
// reading them here.
import { adminFetch } from "./admin-auth.js";

const els = {
  offline: document.getElementById("submissions-offline"),
  count: document.getElementById("submissions-count"),
  empty: document.getElementById("submissions-empty"),
  list: document.getElementById("submissions-list"),
};

if (els.list) {
  function dateLabel(ts) {
    var d = new Date(ts);
    var months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    return months[d.getMonth()] + " " + String(d.getDate()).padStart(2, "0") + " " + d.getFullYear();
  }

  function renderList(rows) {
    els.count.textContent = rows.length + (rows.length === 1 ? " pending" : " pending");
    els.list.innerHTML = "";
    if (rows.length === 0) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    rows.forEach(function (row) {
      var li = document.createElement("li");
      li.className = "gb-entry";

      var head = document.createElement("div");
      head.className = "gb-entry-head";
      var nameEl = document.createElement("span");
      nameEl.className = "gb-entry-nick";
      nameEl.textContent = row.name;
      var dateEl = document.createElement("span");
      dateEl.className = "gb-entry-date";
      dateEl.textContent = dateLabel(row.ts);
      head.append(nameEl, dateEl);

      var urlLink = document.createElement("a");
      urlLink.className = "btn btn-teal";
      urlLink.href = row.url;
      urlLink.target = "_blank";
      urlLink.rel = "noopener";
      urlLink.textContent = row.url;
      urlLink.style.wordBreak = "break-all";

      var pitch = document.createElement("p");
      pitch.className = "gb-entry-msg";
      pitch.textContent = row.pitch;

      li.append(head, urlLink, pitch);

      if (row.contact) {
        var contact = document.createElement("p");
        contact.className = "hint";
        contact.textContent = "contact: " + row.contact;
        li.appendChild(contact);
      }

      var actions = document.createElement("div");
      actions.className = "admin-row-actions";
      var dismissBtn = document.createElement("button");
      dismissBtn.className = "btn"; dismissBtn.type = "button"; dismissBtn.textContent = "dismiss";
      dismissBtn.addEventListener("click", async function () {
        if (!window.confirm('dismiss the request from "' + row.name + '"?')) return;
        dismissBtn.disabled = true;
        var res = await adminFetch("/api/admin/submissions/" + row.id, { method: "DELETE" });
        if (res.ok) load(); else dismissBtn.disabled = false;
      });
      actions.appendChild(dismissBtn);
      li.appendChild(actions);

      els.list.appendChild(li);
    });
  }

  async function load() {
    try {
      var res = await adminFetch("/api/admin/submissions");
      if (!res.ok) {
        els.offline.textContent = "couldn't load wall requests.";
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

  load();
}
