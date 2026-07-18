/* =====================================================================
   Amora — generator UI controller
   Wires the form to ShipNameGenerator and renders result cards.
   ===================================================================== */

(function (global) {
  "use strict";

  const CATEGORIES = [
    "Romantic Couple",
    "Marriage / Wedding",
    "Fictional Characters",
    "Celebrity Pair",
    "Best Friends",
    "Fantasy Characters",
    "Social Media Username",
    "Baby Name Inspiration",
  ];

  const STYLES = [
    "Cute",
    "Romantic",
    "Elegant",
    "Funny",
    "Fantasy",
    "Short & Viral",
    "Unique",
  ];

  // One-tap examples that fill the inputs so people can try the tool instantly.
  const EXAMPLES = [
    { label: "Alex & Emma", name1: "Alex", name2: "Emma" },
    { label: "Liam & Olivia", name1: "Liam", name2: "Olivia" },
  ];

  let state = { category: "Romantic Couple", style: "Cute" };

  // Track the last request so pressing "Generate" again on the same inputs
  // pages forward to a fresh batch instead of repeating the same names.
  let lastSig = "";
  let batch = 0;

  function el(id) {
    return document.getElementById(id);
  }

  /* ---------- build category + style choice chips ---------- */

  function buildChoices() {
    const catWrap = el("categoryChoices");
    const styleWrap = el("styleChoices");

    if (catWrap) {
      catWrap.innerHTML = CATEGORIES.map(function (c, i) {
        const active = i === 0 ? " is-selected" : "";
        return (
          '<button type="button" class="chip' +
          active +
          '" role="radio" aria-checked="' +
          (i === 0) +
          '" data-cat="' +
          c +
          '">' +
          c +
          "</button>"
        );
      }).join("");

      catWrap.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-cat]");
        if (!btn) return;
        state.category = btn.getAttribute("data-cat");
        catWrap.querySelectorAll(".chip").forEach(function (c) {
          const on = c === btn;
          c.classList.toggle("is-selected", on);
          c.setAttribute("aria-checked", String(on));
        });
      });
    }

    if (styleWrap) {
      styleWrap.innerHTML = STYLES.map(function (s, i) {
        const active = i === 0 ? " is-selected" : "";
        return (
          '<button type="button" class="chip chip--style' +
          active +
          '" role="radio" aria-checked="' +
          (i === 0) +
          '" data-style="' +
          s +
          '">' +
          s +
          "</button>"
        );
      }).join("");

      styleWrap.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-style]");
        if (!btn) return;
        state.style = btn.getAttribute("data-style");
        styleWrap.querySelectorAll(".chip").forEach(function (c) {
          const on = c === btn;
          c.classList.toggle("is-selected", on);
          c.setAttribute("aria-checked", String(on));
        });
      });
    }
  }

  /* ---------- one-tap example chips ---------- */

  function buildExamples() {
    const wrap = el("exampleChips");
    if (!wrap) return;

    wrap.innerHTML = EXAMPLES.map(function (ex, i) {
      return (
        '<button type="button" class="chip chip--example" data-ex="' +
        i +
        '">' +
        ex.label +
        "</button>"
      );
    }).join("");

    wrap.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-ex]");
      if (!btn) return;
      const ex = EXAMPLES[Number(btn.getAttribute("data-ex"))];
      if (!ex) return;
      const n1 = el("name1");
      const n2 = el("name2");
      if (n1) n1.value = ex.name1;
      if (n2) n2.value = ex.name2;
      showError("");
      handleGenerate();
    });
  }

  /* ---------- result cards ---------- */

  function resultCard(item, index) {
    const card = document.createElement("div");
    card.className = "result-card";
    card.style.setProperty("--i", index);

    card.innerHTML =
      '<span class="result-card__num">' +
      (index + 1) +
      "</span>" +
      '<div class="result-card__body">' +
      '<span class="result-card__name">' +
      item.name +
      "</span>" +
      '<span class="result-card__label">' +
      Icons.heartFill({ size: 12 }) +
      " " +
      item.label +
      "</span>" +
      "</div>" +
      '<button class="copy-btn" type="button" aria-label="Copy ' +
      item.name +
      '">' +
      Icons.copy({ size: 18 }) +
      "</button>";

    const copyBtn = card.querySelector(".copy-btn");
    copyBtn.addEventListener("click", function () {
      copyText(item.name, copyBtn);
    });

    return card;
  }

  function copyText(text, btn) {
    const done = function () {
      const original = btn.innerHTML;
      btn.innerHTML = Icons.check({ size: 18 });
      btn.classList.add("is-copied");
      setTimeout(function () {
        btn.innerHTML = original;
        btn.classList.remove("is-copied");
      }, 1400);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text, done);
      });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      /* no-op */
    }
    document.body.removeChild(ta);
    done();
  }

  function renderCompat(compat) {
    const wrap = el("compat");
    if (!wrap || !compat) return;
    wrap.classList.add("is-visible");
    wrap.innerHTML =
      '<div class="compat__score">' + compat.score + "%</div>" +
      '<div class="compat__body">' +
      '<span class="compat__label">' + compat.label + "</span>" +
      '<div class="compat__bar"><span class="compat__fill" style="width:0%"></span></div>' +
      "</div>";
    // animate the fill after paint
    const fill = wrap.querySelector(".compat__fill");
    if (fill) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          fill.style.width = compat.score + "%";
        });
      });
    }
  }

  function renderResults(results) {
    const list = el("results");
    const empty = el("resultsEmpty");
    if (!list) return;

    list.innerHTML = "";
    if (!results.length) return;

    if (empty) empty.hidden = true;
    list.hidden = false;

    results.forEach(function (item, i) {
      list.appendChild(resultCard(item, i));
    });

    // Announce for assistive tech.
    const live = el("resultsLive");
    if (live) live.textContent = results.length + " ship names generated.";
  }

  function showError(msg) {
    const err = el("formError");
    if (!err) return;
    err.textContent = msg || "";
    err.hidden = !msg;
  }

  /* ---------- form submit ---------- */

  function handleGenerate(e) {
    if (e) e.preventDefault();
    const name1 = el("name1").value;
    const name2 = el("name2").value;

    // Same inputs as last time -> advance to the next batch of names.
    // Any change (names, style, category) resets back to the first batch.
    const sig = name1 + "|" + name2 + "|" + state.style + "|" + state.category;
    batch = sig === lastSig ? batch + 1 : 0;
    lastSig = sig;

    const out = ShipNameGenerator.generate({
      name1: name1,
      name2: name2,
      category: state.category,
      style: state.style,
      count: 7,
      batch: batch,
    });

    if (!out.ok) {
      showError(out.error);
      return;
    }
    showError("");
    renderCompat(out.compatibility);
    renderResults(out.results);

    // On mobile, bring results into view.
    const panel = el("resultsPanel");
    if (panel && global.matchMedia && global.matchMedia("(max-width: 900px)").matches) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function init() {
    const form = el("generatorForm");
    if (!form) return; // page without the tool
    buildChoices();
    buildExamples();
    form.addEventListener("submit", handleGenerate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
