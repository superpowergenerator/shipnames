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

  let state = { category: "Romantic Couple", style: "Cute", lastPair: null };

  // Track the last request so pressing "Generate" again on the same inputs
  // pages forward to a fresh batch instead of repeating the same names.
  let lastSig = "";
  let batch = 0;

  // Saved names live in localStorage only — nothing leaves the browser.
  const SAVED_KEY = "shipnames.cc.saved";
  const SAVED_MAX = 30;

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function currentPair() {
    const p = state.lastPair;
    if (!p) return "";
    return p.name1 + " + " + p.name2;
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
        const next = btn.getAttribute("data-cat");
        if (next === state.category) return; // already selected: nothing to do
        state.category = next;
        catWrap.querySelectorAll(".chip").forEach(function (c) {
          const on = c === btn;
          c.classList.toggle("is-selected", on);
          c.setAttribute("aria-checked", String(on));
        });
        maybeRegenerate();
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
        const next = btn.getAttribute("data-style");
        if (next === state.style) return; // already selected: nothing to do
        state.style = next;
        styleWrap.querySelectorAll(".chip").forEach(function (c) {
          const on = c === btn;
          c.classList.toggle("is-selected", on);
          c.setAttribute("aria-checked", String(on));
        });
        maybeRegenerate();
      });
    }
  }

  // Re-generate immediately when a filter changes, so the user sees the
  // results update without another click on Generate. Runs whenever both
  // names are filled in, even before the first generate: on a fresh page
  // a filter click used to do nothing until Generate was pressed, which
  // looked broken. Changing a filter changes the request signature, so
  // handleGenerate resets to the first batch for the new filter.
  function maybeRegenerate() {
    const n1 = el("name1"), n2 = el("name2");
    if (n1 && n2 && n1.value.trim() && n2.value.trim()) {
      handleGenerate();
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

  function explainText(item) {
    if (!item.explain) return "";
    return item.explain.pieces
      ? item.explain.pieces + " · " + item.explain.method
      : item.explain.method;
  }

  function resultCard(item, index) {
    const card = document.createElement("div");
    card.className = "result-card";
    card.style.setProperty("--i", index);

    const explain = explainText(item);
    const explainHtml = explain
      ? '<span class="result-card__explain">' + explain + "</span>"
      : "";

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
      explainHtml +
      "</div>" +
      '<span class="result-card__actions">' +
      '<button class="icon-btn save-btn" type="button" data-name="' +
      item.name +
      '" aria-label="Save ' +
      item.name +
      '" aria-pressed="false">' +
      Icons.heart({ size: 17 }) +
      "</button>" +
      '<button class="icon-btn card-btn" type="button" aria-label="Make a name card for ' +
      item.name +
      '">' +
      Icons.image({ size: 17 }) +
      "</button>" +
      '<button class="copy-btn" type="button" aria-label="Copy ' +
      item.name +
      '">' +
      Icons.copy({ size: 18 }) +
      "</button>" +
      "</span>";

    const copyBtn = card.querySelector(".copy-btn");
    copyBtn.addEventListener("click", function () {
      copyText(item.name, copyBtn);
    });

    const saveBtn = card.querySelector(".save-btn");
    saveBtn.addEventListener("click", function () {
      toggleSave(item);
    });
    syncSaveButton(saveBtn, item.name);

    const cardBtn = card.querySelector(".card-btn");
    cardBtn.addEventListener("click", function () {
      openNameCard(item);
    });

    return card;
  }

  /* ---------- save / shortlist ---------- */

  function loadSaved() {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function storeSaved(arr) {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(arr));
    } catch (e) {
      /* no-op: private mode or full storage */
    }
  }

  function isSaved(name) {
    return loadSaved().some(function (s) {
      return s.name === name;
    });
  }

  function syncSaveButton(btn, name) {
    const on = isSaved(name);
    btn.classList.toggle("is-saved", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.innerHTML = on ? Icons.heartFill({ size: 17 }) : Icons.heart({ size: 17 });
  }

  function refreshSaveButtons() {
    document.querySelectorAll(".save-btn").forEach(function (btn) {
      syncSaveButton(btn, btn.getAttribute("data-name"));
    });
  }

  function toggleSave(item) {
    const saved = loadSaved();
    const idx = saved.findIndex(function (s) {
      return s.name === item.name;
    });
    if (idx !== -1) {
      saved.splice(idx, 1);
    } else {
      saved.unshift({
        name: item.name,
        pair: currentPair(),
        label: item.label,
        explain: item.explain || null,
      });
      if (saved.length > SAVED_MAX) saved.length = SAVED_MAX;
    }
    storeSaved(saved);
    renderSaved();
    refreshSaveButtons();
  }

  function renderSaved() {
    const panel = el("resultsPanel");
    if (!panel) return;
    let sec = el("savedSection");
    const saved = loadSaved();
    if (!saved.length) {
      if (sec) sec.remove();
      return;
    }
    if (!sec) {
      sec = document.createElement("div");
      sec.className = "saved-section";
      sec.id = "savedSection";
      const hint = panel.querySelector(".results__hint");
      if (hint) panel.insertBefore(sec, hint);
      else panel.appendChild(sec);
    }
    sec.innerHTML = '<h4 class="saved-section__title">Your saved names</h4>';
    const list = document.createElement("div");
    list.className = "saved-list";
    saved.forEach(function (entry) {
      const row = document.createElement("div");
      row.className = "saved-item";
      row.innerHTML =
        '<div class="saved-item__body">' +
        '<span class="saved-item__name">' +
        escapeHtml(entry.name) +
        "</span>" +
        '<span class="saved-item__pair">' +
        escapeHtml(entry.pair) +
        "</span>" +
        "</div>";
      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.type = "button";
      copyBtn.setAttribute("aria-label", "Copy " + entry.name);
      copyBtn.innerHTML = Icons.copy({ size: 18 });
      copyBtn.addEventListener("click", function () {
        copyText(entry.name, copyBtn);
      });
      const delBtn = document.createElement("button");
      delBtn.className = "icon-btn saved-item__remove";
      delBtn.type = "button";
      delBtn.setAttribute("aria-label", "Remove " + entry.name + " from saved names");
      delBtn.innerHTML = Icons.close({ size: 16 });
      delBtn.addEventListener("click", function () {
        toggleSave(entry);
      });
      row.appendChild(copyBtn);
      row.appendChild(delBtn);
      list.appendChild(row);
    });
    sec.appendChild(list);
    const clearBtn = document.createElement("button");
    clearBtn.className = "saved-section__clear";
    clearBtn.type = "button";
    clearBtn.textContent = "Clear all saved names";
    clearBtn.addEventListener("click", function () {
      storeSaved([]);
      renderSaved();
      refreshSaveButtons();
    });
    sec.appendChild(clearBtn);
  }

  /* ---------- name card modal + PNG download ---------- */

  function openNameCard(item) {
    closeNameCard();
    const pair = currentPair();
    const explain = explainText(item);
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "nameCardModal";
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-label="Name card for ' +
      item.name +
      '">' +
      '<button class="icon-btn modal__close" type="button" aria-label="Close">' +
      Icons.close({ size: 18 }) +
      "</button>" +
      '<div class="name-card">' +
      '<span class="name-card__site">shipnames.cc</span>' +
      '<span class="name-card__name">' +
      item.name +
      "</span>" +
      '<span class="name-card__pair">' +
      escapeHtml(pair) +
      "</span>" +
      (explain ? '<span class="name-card__explain">' + explain + "</span>" : "") +
      "</div>" +
      '<div class="modal__actions">' +
      '<button class="btn btn--primary" type="button" id="nameCardDownload">' +
      Icons.download({ size: 18 }) +
      " Download PNG</button>" +
      '<button class="btn btn--ghost" type="button" id="nameCardCopy">Copy text</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(overlay);
    overlay.querySelector(".modal__close").addEventListener("click", closeNameCard);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeNameCard();
    });
    overlay.querySelector("#nameCardDownload").addEventListener("click", function () {
      downloadNameCard(item, pair, explain);
    });
    overlay.querySelector("#nameCardCopy").addEventListener("click", function (e) {
      const text =
        item.name +
        " — " +
        pair +
        (explain ? " (" + explain + ")" : "") +
        " · shipnames.cc";
      copyText(text, e.currentTarget);
    });
    document.addEventListener("keydown", onCardEscape);
    const closeBtn = overlay.querySelector(".modal__close");
    if (closeBtn) closeBtn.focus();
  }

  function onCardEscape(e) {
    if (e.key === "Escape") closeNameCard();
  }

  function closeNameCard() {
    const m = el("nameCardModal");
    if (m) m.remove();
    document.removeEventListener("keydown", onCardEscape);
  }

  function downloadNameCard(item, pair, explain) {
    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#e0567f");
    grad.addColorStop(1, "#c53c66");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.arc(930, 150, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(130, 950, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 44px Poppins, sans-serif";
    ctx.fillText("shipnames.cc", size / 2, 150);
    let fontSize = 150;
    ctx.font = "700 " + fontSize + "px Poppins, sans-serif";
    while (ctx.measureText(item.name).width > size - 160 && fontSize > 60) {
      fontSize -= 10;
      ctx.font = "700 " + fontSize + "px Poppins, sans-serif";
    }
    ctx.fillText(item.name, size / 2, 540);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "600 52px Poppins, sans-serif";
    ctx.fillText(pair, size / 2, 640);
    if (explain) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "400 40px Poppins, sans-serif";
      ctx.fillText(explain, size / 2, 720);
    }
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "400 34px Poppins, sans-serif";
    ctx.fillText("Made with the Ship Name Generator", size / 2, 960);
    canvas.toBlob(function (blob) {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name.toLowerCase() + "-ship-name.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }, "image/png");
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
    if (!list) return;

    list.innerHTML = "";
    if (!results.length) {
      list.hidden = true;
      return;
    }
    list.hidden = false;

    // Top pick: the first (best-scoring) name, featured on its own row.
    const top = document.createElement("div");
    top.className = "result-top";
    top.innerHTML = '<span class="result-top__badge">Top pick</span>';
    top.appendChild(resultCard(results[0], 0));
    list.appendChild(top);

    // The rest in a 3-per-row grid.
    const rest = results.slice(1);
    if (rest.length) {
      const grid = document.createElement("div");
      grid.className = "results__grid";
      rest.forEach(function (item, i) {
        grid.appendChild(resultCard(item, i + 1));
      });
      list.appendChild(grid);
    }

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
      renderResults([]); // clear any stale results from a previous generate
      return;
    }
    showError("");
    state.lastPair = { name1: name1.trim(), name2: name2.trim() };
    renderCompat(out.compatibility);
    renderResults(out.results);
    // Bring the results into view.
    const panel = el("resultsPanel");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function init() {
    const form = el("generatorForm");
    if (!form) return; // page without the tool
    buildChoices();
    buildExamples();
    renderSaved();
    form.addEventListener("submit", handleGenerate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
