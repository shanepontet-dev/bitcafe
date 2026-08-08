// bit cafe admin: shared session helpers. no accounts system, just one
// shared password -> a signed HttpOnly cookie (see
// functions/_lib/session.js). this file wires the login form on
// admin/index.html, and exports adminFetch()/wireLogout() for every
// other admin/js/*.js file to call the API through -- same role
// js/supabase-config.js plays for the public pages, just talking to
// our own /api/admin/* instead of Supabase directly.

export async function adminFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (res.status === 401) {
    window.location.href = "./index.html";
    throw new Error("not logged in");
  }
  return res;
}

export function wireLogout(button) {
  if (!button) return;
  button.addEventListener("click", async function () {
    button.disabled = true;
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = "./index.html";
  });
}

// login form -- only present on admin/index.html, so this is a no-op
// (and safe to import) everywhere else.
(function wireLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const passwordInput = document.getElementById("login-password");
  const errorEl = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-submit");

  form.addEventListener("submit", async function (evt) {
    evt.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "checking…";

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput.value }),
      });
      if (res.ok) {
        window.location.href = "./dashboard.html";
        return;
      }
      const data = await res.json().catch(function () { return {}; });
      errorEl.textContent = data.error === "wrong password" ? "wrong password." : (data.error || "couldn't log in.");
      errorEl.hidden = false;
    } catch (err) {
      errorEl.textContent = "couldn't reach the admin backend. check your connection.";
      errorEl.hidden = false;
    }

    submitBtn.disabled = false;
    submitBtn.textContent = "clock in →";
    passwordInput.value = "";
    passwordInput.focus();
  });
})();
