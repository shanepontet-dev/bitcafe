// bit cafe: inlines the button-wall badge SVGs into the page so their
// internal animations actually run. an SVG referenced via <img src>
// is treated as a static image by the browser (no CSS/SMIL animation);
// inlining it into the DOM is the only reliable cross-browser way to
// animate one. fetched once per unique badge and cached.
(function () {
  "use strict";

  var cache = {};

  function loadBadge(name) {
    if (cache[name]) return cache[name];
    cache[name] = fetch("img/badges/" + name + ".svg")
      .then(function (r) { return r.text(); })
      .catch(function () { return null; });
    return cache[name];
  }

  document.querySelectorAll(".badge-embed[data-badge]").forEach(function (el) {
    var name = el.dataset.badge;
    var label = el.dataset.label || name;
    loadBadge(name).then(function (svgText) {
      if (!svgText) return; // leave the space empty rather than break the layout
      el.innerHTML = svgText;
      var svg = el.querySelector("svg");
      if (svg) {
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", label);
        svg.removeAttribute("width");
        svg.removeAttribute("height");
      }
    });
  });
})();
