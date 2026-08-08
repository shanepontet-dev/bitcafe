// bit cafe: the notice board. pinned notices are hand-written in the
// page itself; this handles the community board underneath: posting a
// new notice and rendering the live list. same safety baseline as
// chat/guestbook: text only, rendered as text (never HTML), length
// capped, no accounts, no moderation backend (see README.md).
import { supabaseConfig, isConfigured } from "./supabase-config.js";

const els = {
  list: document.getElementById("board-list"),
  empty: document.getElementById("board-empty"),
  offline: document.getElementById("board-offline"),
  form: document.getElementById("board-form"),
  title: document.getElementById("board-title"),
  message: document.getElementById("board-message"),
  link: document.getElementById("board-link"),
  postedBy: document.getElementById("board-postedby"),
  submit: document.getElementById("board-submit"),
  charCount: document.getElementById("board-charcount"),
};

const MAX_TITLE = 60;
const MAX_MESSAGE = 280;
const MAX_NAME = 24;
const MAX_ENTRIES_SHOWN = 100;
const POSTED_BY_KEY = "bitcafe_nick";

if (els.postedBy) {
  els.postedBy.value = window.localStorage.getItem(POSTED_BY_KEY) || "";
}

function dateLabel(ts) {
  var d = new Date(ts);
  var months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  return months[d.getMonth()] + " " + String(d.getDate()).padStart(2, "0");
}

function renderNotices(list) {
  if (!els.list) return;
  els.list.innerHTML = "";
  if (list.length === 0) {
    els.empty.hidden = false;
    return;
  }
  els.empty.hidden = true;

  list.forEach(function (notice) {
    var li = document.createElement("li");
    li.className = "gb-entry";

    var head = document.createElement("div");
    head.className = "gb-entry-head";
    var titleEl = document.createElement("span");
    titleEl.className = "gb-entry-nick";
    titleEl.textContent = notice.title;
    var dateEl = document.createElement("span");
    dateEl.className = "gb-entry-date";
    dateEl.textContent = (notice.postedBy ? notice.postedBy + " · " : "") + dateLabel(notice.ts);
    head.append(titleEl, dateEl);

    var msg = document.createElement("p");
    msg.className = "gb-entry-msg";
    msg.textContent = notice.message;

    li.append(head, msg);

    if (notice.link) {
      var a = document.createElement("a");
      a.className = "btn";
      a.style.marginTop = "0.75rem";
      a.href = notice.link;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "open link →";
      li.appendChild(a);
    }

    els.list.appendChild(li);
  });
}

function updateCharCount() {
  if (!els.charCount || !els.message) return;
  els.charCount.textContent = els.message.value.length + " / " + MAX_MESSAGE;
}

async function boot() {
  if (!isConfigured(supabaseConfig)) {
    if (els.offline) els.offline.hidden = false;
    if (els.empty) els.empty.hidden = false;
    if (els.form) {
      Array.from(els.form.elements).forEach(function (el) { el.disabled = true; });
    }
    return;
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

  // newest pinned to the top of the community section
  var notices = [];

  var { data, error } = await supabase
    .from("board_notices")
    .select("title, message, link, posted_by, ts")
    .order("ts", { ascending: false })
    .limit(MAX_ENTRIES_SHOWN);

  if (error) {
    if (els.offline) els.offline.hidden = false;
    return;
  }

  notices = (data || []).map(rowToNotice);
  renderNotices(notices);

  supabase
    .channel("notices-room")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "board_notices" },
      function (payload) {
        notices.unshift(rowToNotice(payload.new));
        if (notices.length > MAX_ENTRIES_SHOWN) notices.pop();
        renderNotices(notices);
      }
    )
    .subscribe(function (status) {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (els.offline) els.offline.hidden = false;
      }
    });

  if (els.form) {
    els.form.addEventListener("submit", async function (evt) {
      evt.preventDefault();
      var title = els.title.value.trim().slice(0, MAX_TITLE);
      var message = els.message.value.trim().slice(0, MAX_MESSAGE);
      var link = els.link.value.trim().slice(0, 300);
      var postedBy = els.postedBy.value.trim().slice(0, MAX_NAME);
      if (!title || !message) return;
      if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;

      window.localStorage.setItem(POSTED_BY_KEY, postedBy);
      els.submit.disabled = true;
      els.submit.textContent = "pinning…";

      var payload = { title: title, message: message, ts: Date.now() };
      if (link) payload.link = link;
      if (postedBy) payload.posted_by = postedBy;

      var { error: insertError } = await supabase.from("board_notices").insert(payload);

      if (!insertError) {
        els.title.value = "";
        els.message.value = "";
        els.link.value = "";
        updateCharCount();
      }

      els.submit.disabled = false;
      els.submit.textContent = "pin it to the board";
    });
  }
}

function rowToNotice(row) {
  return {
    title: row.title,
    message: row.message,
    link: row.link,
    postedBy: row.posted_by,
    ts: row.ts,
  };
}

if (els.message) {
  els.message.addEventListener("input", updateCharCount);
  updateCharCount();
}

boot().catch(function (err) {
  console.error("bit cafe notice board failed to connect:", err);
  if (els.offline) els.offline.hidden = false;
});
