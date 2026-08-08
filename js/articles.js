// bit cafe: the reading menu (articles.html) and the article template
// (article.html?slug=...). both read admin-authored content straight
// from Supabase with the anon key -- RLS only exposes published=true
// rows (see supabase/002_articles_movies.sql), same "read with the
// anon key, write only from a trusted server" split as the rest of
// the admin-managed tables.
//
// unlike chat/guestbook/notices, body_html is rendered via innerHTML
// on purpose: it's only ever written by the logged-in /admin panel
// (functions/api/admin/articles/*), never by public input, so the
// "always textContent, never innerHTML" rule those pages follow
// doesn't apply here -- there's no untrusted author to guard against.
import { supabaseConfig, isConfigured } from "./supabase-config.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function dateLabel(iso) {
  var d = new Date(iso);
  return MONTHS[d.getMonth()] + " " + String(d.getDate()).padStart(2, "0") + ", " + d.getFullYear();
}

async function getSupabase() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  return createClient(supabaseConfig.url, supabaseConfig.anonKey);
}

async function fetchPublishedArticles(supabase) {
  var { data, error } = await supabase
    .from("articles")
    .select("slug, title, dek, byline, body_html, pull_quote, pull_cite, read_minutes, created_at")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// ---- articles.html: the reading menu list -----------------------------
async function bootMenu() {
  var list = document.getElementById("order-board");
  if (!list) return;

  var offline = document.getElementById("menu-offline");
  var empty = document.getElementById("menu-empty");

  if (!isConfigured(supabaseConfig)) {
    if (offline) offline.hidden = false;
    return;
  }

  try {
    var supabase = await getSupabase();
    var articles = await fetchPublishedArticles(supabase);

    if (articles.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }

    articles.forEach(function (article, index) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "order-line";
      a.href = "article.html?slug=" + encodeURIComponent(article.slug);

      var no = document.createElement("span");
      no.className = "no";
      no.textContent = String(index + 1).padStart(2, "0");

      var desc = document.createElement("span");
      desc.className = "desc";
      var titleEl = document.createElement("span");
      titleEl.className = "title";
      titleEl.textContent = article.title;
      var subEl = document.createElement("span");
      subEl.className = "sub";
      subEl.textContent = article.dek;
      desc.append(titleEl, subEl);

      var price = document.createElement("span");
      price.className = "price";
      price.textContent = article.read_minutes + " min";

      a.append(no, desc, price);
      li.appendChild(a);
      list.appendChild(li);
    });
  } catch (err) {
    console.error("bit cafe reading menu failed to load:", err);
    if (offline) offline.hidden = false;
  }
}

// ---- article.html: single-article template -----------------------------
async function bootArticle() {
  var root = document.getElementById("article-root");
  if (!root) return;

  var offline = document.getElementById("article-offline");
  var notFound = document.getElementById("article-notfound");
  var content = document.getElementById("article-content");
  var navEl = document.getElementById("article-nav");
  var slug = new URLSearchParams(window.location.search).get("slug");

  if (!slug || !isConfigured(supabaseConfig)) {
    if (offline) offline.hidden = false;
    return;
  }

  try {
    var supabase = await getSupabase();
    var articles = await fetchPublishedArticles(supabase);
    var index = articles.findIndex(function (a) { return a.slug === slug; });

    if (index === -1) {
      if (notFound) notFound.hidden = false;
      return;
    }

    var article = articles[index];

    document.title = article.title + " · bit cafe";
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", article.dek + " a bit cafe article by " + (article.byline || "fletcher") + ".");
    }

    var metaEl = document.getElementById("article-meta");
    [dateLabel(article.created_at), article.read_minutes + " min read", "by " + (article.byline || "fletcher")]
      .forEach(function (text, i) {
        if (i > 0) {
          var sep = document.createElement("span");
          sep.textContent = "·";
          metaEl.appendChild(sep);
        }
        var span = document.createElement("span");
        span.textContent = text;
        metaEl.appendChild(span);
      });

    document.getElementById("article-title").textContent = article.title;

    var bodyEl = document.getElementById("article-body");
    // body_html is stored as one <p>...</p> block per line (see
    // admin/js/admin-articles.js's plainParagraphsToHtml) -- splitting
    // on newline recovers exactly the paragraph list, no HTML parsing
    // needed. the pull quote always lands after the second paragraph
    // (or the last one, for a short article); that's a fixed
    // rendering rule, not per-article data.
    var paragraphs = String(article.body_html || "").split("\n").filter(Boolean);
    var quoteAt = Math.min(2, paragraphs.length);
    paragraphs.slice(0, quoteAt).forEach(function (p) { bodyEl.insertAdjacentHTML("beforeend", p); });
    if (article.pull_quote) {
      var bq = document.createElement("blockquote");
      bq.className = "pull-stamp";
      bq.appendChild(document.createTextNode(article.pull_quote));
      if (article.pull_cite) {
        var cite = document.createElement("cite");
        cite.textContent = article.pull_cite;
        bq.appendChild(cite);
      }
      bodyEl.appendChild(bq);
    }
    paragraphs.slice(quoteAt).forEach(function (p) { bodyEl.insertAdjacentHTML("beforeend", p); });

    content.hidden = false;

    // prev/next: circular, matching the original hand-authored articles
    // (see articles/*.html before this went dynamic) -- the very first
    // article's "prev" points back to the menu instead of wrapping to
    // the last one; "next" always wraps, with a different label on the
    // last article so "back to the start" reads honestly.
    if (articles.length > 0) {
      navEl.hidden = false;
      var prevLink = document.getElementById("article-nav-prev");
      var nextLink = document.getElementById("article-nav-next");

      var prevArticle = articles[index - 1];
      setNavLink(prevLink, prevArticle ? "« previous" : "« back to",
        prevArticle ? "article.html?slug=" + encodeURIComponent(prevArticle.slug) : "articles.html",
        prevArticle ? prevArticle.title : "the reading menu");

      if (articles.length > 1) {
        var nextArticle = articles[(index + 1) % articles.length];
        var isLast = index === articles.length - 1;
        nextLink.hidden = false;
        setNavLink(nextLink, isLast ? "back to the start »" : "next up »",
          "article.html?slug=" + encodeURIComponent(nextArticle.slug), nextArticle.title);
      } else {
        nextLink.hidden = true;
      }
    }
  } catch (err) {
    console.error("bit cafe article failed to load:", err);
    if (offline) offline.hidden = false;
  }
}

function setNavLink(link, dirText, href, label) {
  link.href = href;
  link.textContent = "";
  var dir = document.createElement("span");
  dir.className = "dir";
  dir.textContent = dirText;
  link.appendChild(dir);
  link.appendChild(document.createTextNode(label));
}

bootMenu().catch(function (err) { console.error("bit cafe reading menu failed to connect:", err); });
bootArticle().catch(function (err) { console.error("bit cafe article failed to connect:", err); });
