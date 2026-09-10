/* =====================================================================
   Ship Names — shared layout behavior
   Header and footer are injected at build time.
   This file only handles client-side header interactions.
   ===================================================================== */

(function (global) {
  "use strict";

  function setActiveNav() {
    const active = document.body.getAttribute("data-page") || "";

    document.querySelectorAll("[data-nav-key]").forEach(function (link) {
      const isActive = link.getAttribute("data-nav-key") === active;

      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function initMobileMenu() {
    const toggle = document.getElementById("navToggle");
    const mobileNav = document.getElementById("mobileNav");

    if (!toggle || !mobileNav || !global.Icons) {
      return;
    }

    function setIcon(open) {
      toggle.innerHTML = open
        ? global.Icons.close({ size: 26 })
        : global.Icons.menu({ size: 26 });
    }

    function closeMenu() {
      mobileNav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      setIcon(false);
    }

    toggle.addEventListener("click", function () {
      const open = mobileNav.classList.toggle("is-open");

      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute(
        "aria-label",
        open ? "Close menu" : "Open menu"
      );

      setIcon(open);
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
  }

  function init() {
    setActiveNav();
    initMobileMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.SiteComponents = {
    renderHeader: function () {},
    renderFooter: function () {}
  };

})(window);
