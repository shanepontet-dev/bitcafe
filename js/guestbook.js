// bit cafe: the guestbook ledger
// real, persisted entries over the same Supabase project as the
// chatroom. same disclosed limitation: no accounts, no moderation
// backend, freeform nicknames. see README.md.
import { supabaseConfig, isConfigured } from "./supabase-config.js";

const els = {
  list: document.getElementById("gb-list"),
  empty: document.getElementById("gb-empty"),
  offline: document.getElementById("gb-offline"),
  count: document.getElementById("gb-count"),
  form: document.getElementById("gb-form"),
  nick: document.getElementById("gb-nick"),
  text: document.getElementById("gb-text"),
  submit: document.getElementById("gb-submit"),
  charCount: document.getElementById("gb-charcount"),
};

const NICK_KEY = "bitcafe_nick";
const MAX_NICK = 24;
const MAX_MSG = 240;
const MAX_ENTRIES_SHOWN = 150;

if (els.nick) {
  els.nick.value = window.localStorage.getItem(NICK_KEY) || "";
}

function dateLabel(ts) {
  var d = new Date(ts);
  var months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  return months[d.getMonth()] + " " + String(d.getDate()).padStart(2, "0") + ", " + d.getFullYear();
}

function stampFor(index) {
  // alternate the two house ink colors so a long ledger doesn't go monotone
  return index % 3 === 0 ? "teal" : "";
}

function renderEntries(list) {
  if (!els.list) return;
  els.list.innerHTML = "";
  if (list.length === 0) {
    els.empty.hidden = false;
    if (els.count) els.count.textContent = "0";
    return;
  }
  els.empty.hidden = true;
  if (els.count) els.count.textContent = String(list.length);

  list.forEach(function (entry, i) {
    var li = document.createElement("li");
    li.className = "gb-entry";

    var head = document.createElement("div");
    head.className = "gb-entry-head";

    var nick = document.createElement("span");
    nick.className = "gb-entry-nick";
    nick.textContent = entry.nick;

    var date = document.createElement("span");
    date.className = "gb-entry-date";
    date.textContent = dateLabel(entry.ts);

    head.append(nick, date);

    var msg = document.createElement("p");
    msg.className = "gb-entry-msg";
    msg.textContent = entry.message;

    li.append(head, msg);

    if (i < 3) {
      var badge = document.createElement("span");
      badge.className = "stamp small " + stampFor(i);
      badge.textContent = i === 0 ? "fresh ink" : "signed";
      li.appendChild(badge);
    }

    els.list.appendChild(li);
  });
}

function updateCharCount() {
  if (!els.charCount || !els.text) return;
  els.charCount.textContent = els.text.value.length + " / " + MAX_MSG;
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

  // entries: newest first, like a fresh ticket on top of the spike.
  var entries = [];

  var { data, error } = await supabase
    .from("guestbook_entries")
    .select("nick, message, ts")
    .order("ts", { ascending: false })
    .limit(MAX_ENTRIES_SHOWN);

  if (error) {
    if (els.offline) els.offline.hidden = false;
    return;
  }

  entries = data || [];
  renderEntries(entries);

  supabase
    .channel("guestbook-room")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "guestbook_entries" },
      function (payload) {
        entries.unshift({
          nick: payload.new.nick,
          message: payload.new.message,
          ts: payload.new.ts,
        });
        if (entries.length > MAX_ENTRIES_SHOWN) entries.pop();
        renderEntries(entries);
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
      var nick = (els.nick.value || "").trim().slice(0, MAX_NICK);
      var message = (els.text.value || "").trim().slice(0, MAX_MSG);
      if (!nick || !message) return;

      window.localStorage.setItem(NICK_KEY, nick);
      els.submit.disabled = true;
      els.submit.textContent = "stamping…";

      var { error: insertError } = await supabase
        .from("guestbook_entries")
        .insert({ nick: nick, message: message, ts: Date.now() });

      if (!insertError) {
        els.text.value = "";
        updateCharCount();
      }

      els.submit.disabled = false;
      els.submit.textContent = "sign & stamp";
    });
  }
}

if (els.text) {
  els.text.addEventListener("input", updateCharCount);
  updateCharCount();
}

boot().catch(function (err) {
  console.error("bit cafe guestbook failed to connect:", err);
  if (els.offline) els.offline.hidden = false;
});
