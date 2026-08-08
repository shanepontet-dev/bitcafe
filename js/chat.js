// bit cafe: the chatroom till
// real, live, multi-user chat over Supabase (Postgres + realtime).
// no accounts: a nickname is just a label you print on your own
// tickets. there is no moderation backend: see the notice in
// chat.html and README.md's "the till has no bouncer" section.
import { supabaseConfig, isConfigured } from "./supabase-config.js";

const els = {
  statusPill: document.getElementById("chat-status"),
  count: document.getElementById("chat-count"),
  log: document.getElementById("chat-log"),
  empty: document.getElementById("chat-empty"),
  offline: document.getElementById("chat-offline"),
  form: document.getElementById("chat-form"),
  nick: document.getElementById("chat-nick"),
  text: document.getElementById("chat-text"),
  send: document.getElementById("chat-send"),
  charCount: document.getElementById("chat-charcount"),
};

const NICK_KEY = "bitcafe_nick";
const MAX_NICK = 20;
const MAX_MSG = 300;
const SEND_COOLDOWN_MS = 1200;
const MAX_MESSAGES_SHOWN = 200;

if (els.nick) {
  els.nick.value = window.localStorage.getItem(NICK_KEY) || "";
}

function sessionId() {
  return window.crypto && window.crypto.randomUUID
    ? window.crypto.randomUUID()
    : "guest-" + Math.random().toString(36).slice(2);
}

function setOnlineUi(isLive) {
  if (!els.statusPill) return;
  els.statusPill.classList.toggle("is-live", isLive);
  els.statusPill.querySelector(".label").textContent = isLive ? "live" : "offline";
}

function timeLabel(ts) {
  var d = new Date(ts);
  var h = String(d.getHours()).padStart(2, "0");
  var m = String(d.getMinutes()).padStart(2, "0");
  return h + ":" + m;
}

function renderMessages(list) {
  if (!els.log) return;
  var wasNearBottom =
    els.log.scrollHeight - els.log.scrollTop - els.log.clientHeight < 80;

  els.log.innerHTML = "";
  if (list.length === 0) {
    els.empty.hidden = false;
  } else {
    els.empty.hidden = true;
    list.forEach(function (msg) {
      var row = document.createElement("p");
      row.className = "chat-line";

      var time = document.createElement("span");
      time.className = "chat-time";
      time.textContent = "[" + timeLabel(msg.ts) + "]";

      var nick = document.createElement("span");
      nick.className = "chat-nick";
      nick.textContent = msg.nick; // textContent: never trust user text as markup

      var sep = document.createTextNode(" » "); // »
      var text = document.createTextNode(msg.text);

      row.append(time, " ", nick, sep, text);
      els.log.appendChild(row);
    });
  }

  if (wasNearBottom) {
    els.log.scrollTop = els.log.scrollHeight;
  }
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
    setOnlineUi(false);
    if (els.count) els.count.textContent = "--";
    return;
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

  // messages: kept as a small local array, seeded from an initial
  // fetch, then appended to as realtime inserts arrive -- simpler and
  // sturdier than re-fetching the whole log on every change, and
  // there is no moderation pass to run in between.
  var messages = [];

  var { data, error } = await supabase
    .from("chat_messages")
    .select("nick, text, ts")
    .order("ts", { ascending: false })
    .limit(MAX_MESSAGES_SHOWN);

  if (error) {
    if (els.offline) els.offline.hidden = false;
    setOnlineUi(false);
    return;
  }

  messages = (data || []).slice().reverse();
  renderMessages(messages);

  var myKey = sessionId();
  var channel = supabase.channel("chat-room", {
    config: { presence: { key: myKey } },
  });

  channel
    .on("presence", { event: "sync" }, function () {
      var state = channel.presenceState();
      var n = Object.keys(state).length;
      if (els.count) els.count.textContent = n === 1 ? "1 visitor" : n + " visitors";
    })
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      function (payload) {
        messages.push({
          nick: payload.new.nick,
          text: payload.new.text,
          ts: payload.new.ts,
        });
        if (messages.length > MAX_MESSAGES_SHOWN) {
          messages = messages.slice(messages.length - MAX_MESSAGES_SHOWN);
        }
        renderMessages(messages);
      }
    )
    .subscribe(async function (status) {
      setOnlineUi(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: Date.now() });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (els.offline) els.offline.hidden = false;
      }
    });

  let lastSent = 0;
  if (els.form) {
    els.form.addEventListener("submit", async function (evt) {
      evt.preventDefault();
      var nick = (els.nick.value || "").trim().slice(0, MAX_NICK) || "anonymous";
      var text = (els.text.value || "").trim().slice(0, MAX_MSG);
      if (!text) return;

      var now = Date.now();
      if (now - lastSent < SEND_COOLDOWN_MS) return;
      lastSent = now;

      window.localStorage.setItem(NICK_KEY, nick);
      els.send.disabled = true;
      els.send.textContent = "printing…";

      var { error } = await supabase
        .from("chat_messages")
        .insert({ nick: nick, text: text, ts: now });

      if (!error) {
        els.text.value = "";
        updateCharCount();
      }

      setTimeout(function () {
        els.send.disabled = false;
        els.send.textContent = "print it";
      }, SEND_COOLDOWN_MS);
    });
  }
}

if (els.text) {
  els.text.addEventListener("input", updateCharCount);
  updateCharCount();
}

boot().catch(function (err) {
  console.error("bit cafe chat failed to connect:", err);
  if (els.offline) els.offline.hidden = false;
  setOnlineUi(false);
});
