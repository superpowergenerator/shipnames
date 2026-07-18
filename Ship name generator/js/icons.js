/* =====================================================================
   Amora — inline SVG icon set
   Each icon is a function returning an <svg> string. No external assets.
   Usage: Icons.heart({ size: 20, cls: "my-class" })
   ===================================================================== */

(function (global) {
  "use strict";

  function svg(inner, opts) {
    opts = opts || {};
    const size = opts.size || 24;
    const cls = opts.cls ? ' class="' + opts.cls + '"' : "";
    const stroke = opts.stroke || "currentColor";
    const fill = opts.fill || "none";
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      size +
      '" height="' +
      size +
      '" viewBox="0 0 24 24" fill="' +
      fill +
      '" stroke="' +
      stroke +
      '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' +
      cls +
      ' aria-hidden="true" focusable="false">' +
      inner +
      "</svg>"
    );
  }

  const Icons = {
    heart: (o) =>
      svg(
        '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
        o
      ),
    heartFill: (o) =>
      svg(
        '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
        Object.assign({ fill: "currentColor" }, o || {})
      ),
    copy: (o) =>
      svg(
        '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>',
        o
      ),
    check: (o) => svg('<path d="M20 6 9 17l-5-5"/>', o),
    sparkles: (o) =>
      svg(
        '<path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
        o
      ),
    users: (o) =>
      svg(
        '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        o
      ),
    book: (o) =>
      svg(
        '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
        o
      ),
    ring: (o) =>
      svg(
        '<circle cx="12" cy="14" r="6"/><path d="M9 6l3-3 3 3"/><path d="M9 6l1.5 3.2M15 6l-1.5 3.2"/>',
        o
      ),
    phone: (o) =>
      svg(
        '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
        o
      ),
    star: (o) =>
      svg(
        '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"/>',
        o
      ),
    menu: (o) => svg('<path d="M3 6h18M3 12h18M3 18h18"/>', o),
    close: (o) => svg('<path d="M18 6 6 18M6 6l12 12"/>', o),
    arrowRight: (o) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', o),
    edit: (o) =>
      svg(
        '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
        o
      ),
    layers: (o) =>
      svg(
        '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
        o
      ),
    mail: (o) =>
      svg(
        '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
        o
      ),
    instagram: (o) =>
      svg(
        '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
        o
      ),
    twitter: (o) =>
      svg(
        '<path d="M4 4l7.5 9.5L4.5 20H7l5.3-5.7L16.5 20H20l-7.8-9.9L19.3 4H16.8l-4.8 5.2L8.2 4H4z" fill="currentColor" stroke="none"/>',
        o
      ),
    facebook: (o) =>
      svg(
        '<path d="M14 8h2V5h-2c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.2l.8-3H14V8.5c0-.3.2-.5.5-.5z" fill="currentColor" stroke="none"/>',
        o
      ),
    pinterest: (o) =>
      svg(
        '<path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.7 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.8 1.5 1.8 1.8 0 3-2.3 3-5 0-2-1.4-3.6-3.9-3.6a4.5 4.5 0 0 0-4.7 4.5c0 .9.3 1.5.7 2 .2.2.2.3.1.5l-.2.9c-.1.3-.3.4-.6.2-1.2-.5-1.8-1.9-1.8-3.5 0-2.6 2.2-5.7 6.5-5.7 3.5 0 5.8 2.5 5.8 5.2 0 3.5-2 6.2-4.9 6.2-1 0-1.9-.5-2.2-1.1l-.6 2.4c-.2.8-.7 1.7-1 2.2A10 10 0 1 0 12 2z" fill="currentColor" stroke="none"/>',
        o
      ),
  };

  global.Icons = Icons;
})(window);
