// bit cafe admin: the "articles" tab -- list, create, edit, delete.
// body text is edited as plain paragraphs (blank line = new
// paragraph, matching every other textarea on this site) and
// converted to/from the body_html the public article.html template
// renders; that conversion only has to round-trip cleanly because
// body_html here is always just a run of <p> tags -- a pull quote is
// its own pull_quote/pull_cite fields, never embedded inline, so
// there's no other markup shape to preserve.
import { adminFetch } from "./admin-auth.js";

const els = {
  offline: document.getElementById("articles-offline"),
  count: document.getElementById("articles-count"),
  newBtn: document.getElementById("article-new-btn"),
  form: document.getElementById("article-form"),
  formError: document.getElementById("article-form-error"),
  cancelBtn: document.getElementById("article-cancel-btn"),
  saveBtn: document.getElementById("article-save-btn"),
  empty: document.getElementById("articles-empty"),
  list: document.getElementById("articles-list"),
  id: document.getElementById("article-id"),
  title: document.getElementById("article-title"),
  byline: document.getElementById("article-byline"),
  dek: document.getElementById("article-dek"),
  slug: document.getElementById("article-slug"),
  readMinutes: document.getElementById("article-read-minutes"),
  body: document.getElementById("article-body"),
  pullQuote: document.getElementById("article-pull-quote"),
  pullCite: document.getElementById("article-pull-cite"),
  published: document.getElementById("article-published"),
};

if (els.list) {
  function htmlToPlainParagraphs(html) {
    var holder = document.createElement("div");
    return String(html || "")
      .split(/<\/p>\s*<p>/i)
      .map(function (chunk) {
        holder.innerHTML = chunk.replace(/^\s*<p>/i, "").replace(/<\/p>\s*$/i, "");
        return holder.textContent;
      })
      .join("\n\n");
  }

  function plainParagraphsToHtml(text) {
    var holder = document.createElement("div");
    return String(text || "")
      .split(/\n\s*\n/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean)
      .map(function (p) {
        holder.textContent = p;
        return "<p>" + holder.innerHTML.replace(/\n/g, "<br>") + "</p>";
      })
      .join("\n");
  }

  function resetForm() {
    els.form.reset();
    els.id.value = "";
    els.published.checked = true;
    els.formError.hidden = true;
    els.saveBtn.textContent = "save article";
  }

  function openForCreate() {
    resetForm();
    els.form.hidden = false;
    els.title.focus();
  }

  function openForEdit(article) {
    resetForm();
    els.id.value = article.id;
    els.title.value = article.title;
    els.byline.value = article.byline || "";
    els.dek.value = article.dek;
    els.slug.value = article.slug;
    els.readMinutes.value = article.read_minutes;
    els.body.value = htmlToPlainParagraphs(article.body_html);
    els.pullQuote.value = article.pull_quote || "";
    els.pullCite.value = article.pull_cite || "";
    els.published.checked = !!article.published;
    els.saveBtn.textContent = "update article";
    els.form.hidden = false;
    els.title.focus();
  }

  els.newBtn.addEventListener("click", openForCreate);
  els.cancelBtn.addEventListener("click", function () { els.form.hidden = true; });

  function renderList(articles) {
    els.count.textContent = articles.length + (articles.length === 1 ? " article" : " articles");
    els.list.innerHTML = "";
    if (articles.length === 0) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    articles.forEach(function (article) {
      var li = document.createElement("li");
      li.className = "gb-entry";

      var head = document.createElement("div");
      head.className = "gb-entry-head";
      var titleEl = document.createElement("span");
      titleEl.className = "gb-entry-nick";
      titleEl.textContent = article.title;
      var stamp = document.createElement("span");
      stamp.className = "stamp small" + (article.published ? " teal" : "");
      stamp.textContent = article.published ? "live" : "draft";
      head.append(titleEl, stamp);

      var dek = document.createElement("p");
      dek.className = "gb-entry-msg";
      dek.textContent = article.dek + " · " + article.read_minutes + " min · by " + (article.byline || "fletcher");

      var actions = document.createElement("div");
      actions.className = "admin-row-actions";

      var editBtn = document.createElement("button");
      editBtn.className = "btn"; editBtn.type = "button"; editBtn.textContent = "edit";
      editBtn.addEventListener("click", function () { openForEdit(article); });

      var viewLink = document.createElement("a");
      viewLink.className = "btn btn-teal"; viewLink.textContent = "view →";
      viewLink.href = "../article.html?slug=" + encodeURIComponent(article.slug);
      viewLink.target = "_blank"; viewLink.rel = "noopener";

      var deleteBtn = document.createElement("button");
      deleteBtn.className = "btn"; deleteBtn.type = "button"; deleteBtn.textContent = "delete";
      deleteBtn.addEventListener("click", async function () {
        if (!window.confirm('delete "' + article.title + '"? this can\'t be undone.')) return;
        deleteBtn.disabled = true;
        var res = await adminFetch("/api/admin/articles/" + article.id, { method: "DELETE" });
        if (res.ok) load(); else deleteBtn.disabled = false;
      });

      actions.append(editBtn, viewLink, deleteBtn);
      li.append(head, dek, actions);
      els.list.appendChild(li);
    });
  }

  async function load() {
    try {
      var res = await adminFetch("/api/admin/articles");
      if (!res.ok) {
        els.offline.textContent = "couldn't load articles.";
        els.offline.hidden = false;
        return;
      }
      els.offline.hidden = true;
      renderList(await res.json());
    } catch (err) {
      // adminFetch already redirects on 401 -- anything else is a real failure
      els.offline.textContent = "couldn't reach the admin backend.";
      els.offline.hidden = false;
    }
  }

  els.form.addEventListener("submit", async function (evt) {
    evt.preventDefault();
    els.formError.hidden = true;
    els.saveBtn.disabled = true;

    var body = {
      title: els.title.value.trim(),
      byline: els.byline.value.trim() || "fletcher",
      dek: els.dek.value.trim(),
      slug: els.slug.value.trim(),
      read_minutes: parseInt(els.readMinutes.value, 10) || 5,
      body_html: plainParagraphsToHtml(els.body.value),
      pull_quote: els.pullQuote.value.trim(),
      pull_cite: els.pullCite.value.trim(),
      published: els.published.checked,
    };

    var id = els.id.value;
    var res = id
      ? await adminFetch("/api/admin/articles/" + id, { method: "PATCH", body: JSON.stringify(body) })
      : await adminFetch("/api/admin/articles", { method: "POST", body: JSON.stringify(body) });

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
