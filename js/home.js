/* =====================================================================
   Ship Names — generic icon injector
   Any element with data-icon="name" gets the matching inline SVG.
   Optional: data-icon-size="20". Keeps content text in the HTML (SEO)
   while reusing the shared icon set.
   ===================================================================== */

(function () {
  "use strict";

  function paint() {
    if (typeof Icons === "undefined") return;
    document.querySelectorAll("[data-icon]").forEach(function (node) {
      var name = node.getAttribute("data-icon");
      if (!name || !Icons[name]) return;
      var size = parseInt(node.getAttribute("data-icon-size"), 10) || 20;
      node.innerHTML = Icons[name]({ size: size });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }
})();
