/* =====================================================================
   Amora — contact page wiring
   Fills contact icons and validates the form client-side.
   NOTE: there is no backend — submit is simulated in the browser.
   ===================================================================== */

(function () {
  "use strict";

  function set(id, html) {
    const node = document.getElementById(id);
    if (node) node.innerHTML = html;
  }

  function init() {
    if (typeof Icons !== "undefined") {
      set("ciMail", Icons.mail({ size: 22 }));
      set("ciChat", Icons.users({ size: 22 }));
      set("ciHeart", Icons.heartFill({ size: 22 }));
      set("successIcon", Icons.check({ size: 20 }));
    }

    const form = document.getElementById("contactForm");
    if (!form) return;

    const err = document.getElementById("contactError");
    const success = document.getElementById("contactSuccess");

    function showError(msg) {
      if (!err) return;
      err.textContent = msg || "";
      err.hidden = !msg;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = document.getElementById("cName").value.trim();
      const email = document.getElementById("cEmail").value.trim();
      const message = document.getElementById("cMessage").value.trim();

      if (!name || !email || !message) {
        showError("Please fill in every field.");
        return;
      }
      // simple email sanity check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError("Please enter a valid email address.");
        return;
      }

      showError("");
      if (success) success.classList.add("is-visible");
      form.reset();
      // hide the confirmation again after a while
      setTimeout(function () {
        if (success) success.classList.remove("is-visible");
      }, 5000);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
