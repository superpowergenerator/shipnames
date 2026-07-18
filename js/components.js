/* =====================================================================
   Amora — shared layout components (header + footer)
   Injected into every page so navigation stays DRY.
   Set <body data-page="home|generator|about|contact"> to mark active nav.
   ===================================================================== */

(function (global) {
  "use strict";

  const NAV = [
    { label: "Home", href: "/", key: "home" },
    { label: "Generator", href: "/#generator", key: "generator" },
    { label: "Blog", href: "blog.html", key: "blog" },
    { label: "About", href: "about.html", key: "about" },
    { label: "Contact", href: "contact.html", key: "contact" },
  ];

  function logoMarkup() {
    return (
      '<a class="brand" href="/" aria-label="Ship Names home">' +
      '<span class="brand__mark">' +
      Icons.heartFill({ size: 30 }) +
      "</span>" +
      "<span>Ship Names</span>" +
      "</a>"
    );
  }

  function renderHeader() {
    const mount = document.getElementById("site-header");
    if (!mount) return;
    const active = document.body.getAttribute("data-page") || "";

    const links = NAV.map(function (n) {
      const is = n.key === active ? ' class="is-active" aria-current="page"' : "";
      return "<li><a href=\"" + n.href + "\"" + is + ">" + n.label + "</a></li>";
    }).join("");

    const mobileLinks = NAV.map(function (n) {
      return '<a href="' + n.href + '">' + n.label + "</a>";
    }).join("");

    mount.innerHTML =
      '<div class="container">' +
      '<div class="nav">' +
      logoMarkup() +
      '<ul class="nav__links">' +
      links +
      "</ul>" +
      '<a class="btn btn--primary nav__cta" href="/#generator">Generate Now</a>' +
      '<button class="nav__toggle" id="navToggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobileNav">' +
      Icons.menu({ size: 26 }) +
      "</button>" +
      "</div>" +
      "</div>" +
      '<div class="nav__mobile" id="mobileNav">' +
      mobileLinks +
      '<a class="btn btn--primary" href="/#generator">Generate Now</a>' +
      "</div>";

    const toggle = document.getElementById("navToggle");
    const mobileNav = document.getElementById("mobileNav");

    function closeMenu() {
      mobileNav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = Icons.menu({ size: 26 });
    }

    toggle.addEventListener("click", function () {
      const open = mobileNav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = open ? Icons.close({ size: 26 }) : Icons.menu({ size: 26 });
    });

    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }

  function renderFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;
    const year = mount.getAttribute("data-year") || "2026";

    const col = function (title, links) {
      return (
        '<div class="footer__col"><h4>' +
        title +
        "</h4><ul>" +
        links
          .map(function (l) {
            return '<li><a href="' + l.href + '">' + l.label + "</a></li>";
          })
          .join("") +
        "</ul></div>"
      );
    };

    const social = [
      { icon: "instagram", label: "Instagram", href: "#" },
      { icon: "twitter", label: "Twitter / X", href: "#" },
      { icon: "facebook", label: "Facebook", href: "#" },
      { icon: "pinterest", label: "Pinterest", href: "#" },
    ]
      .map(function (s) {
        return (
          '<a href="' +
          s.href +
          '" aria-label="' +
          s.label +
          '" rel="noopener">' +
          Icons[s.icon]({ size: 18 }) +
          "</a>"
        );
      })
      .join("");

    mount.innerHTML =
      '<div class="container">' +
      '<div class="footer__grid">' +
      '<div class="footer__brand">' +
      logoMarkup() +
      '<p class="footer__about">Blend two names into one ship name for couples, stories, weddings, and social handles.</p>' +
      '<div class="footer__social">' +
      social +
      "</div>" +
      "</div>" +
      col("Explore", [
        { label: "Home", href: "/" },
        { label: "Generator", href: "/#generator" },
        { label: "Blog", href: "blog.html" },
        { label: "About", href: "about.html" },
        { label: "Contact", href: "contact.html" },
      ]) +
      col("Legal", [
        { label: "Privacy Policy", href: "privacy.html" },
        { label: "Terms of Service", href: "terms.html" },
        { label: "Disclaimer", href: "disclaimer.html" },
      ]) +
      "</div>" +
      '<div class="footer__bottom">' +
      "<span>© " +
      year +
      " Ship Names. All rights reserved.</span>" +
      '<span class="made-with">Made with ' +
      Icons.heartFill({ size: 15 }) +
      " for love stories everywhere.</span>" +
      "</div>" +
      "</div>";
  }

  function init() {
    if (global.Icons) {
      renderHeader();
      renderFooter();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.SiteComponents = { renderHeader: renderHeader, renderFooter: renderFooter };
})(window);
