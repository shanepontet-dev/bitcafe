// bit cafe admin: tab switching for dashboard.html, plus wiring the
// logout button. each panel/js file (admin-articles.js etc.) owns its
// own data fetching -- this only ever touches which panel is visible.
import { wireLogout } from "./admin-auth.js";

const tabButtons = document.querySelectorAll(".admin-tabs [data-tab]");
const panels = {
  articles: document.getElementById("panel-articles"),
  webring: document.getElementById("panel-webring"),
  movies: document.getElementById("panel-movies"),
};

tabButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    const target = btn.getAttribute("data-tab");
    tabButtons.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
    Object.keys(panels).forEach(function (name) {
      if (panels[name]) panels[name].hidden = name !== target;
    });
  });
});

wireLogout(document.getElementById("logout-btn"));
