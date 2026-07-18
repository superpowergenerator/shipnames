/* =====================================================================
   Amora — Ship Name Generator
   Human-style blending engine (no dependencies).

   Philosophy: generate ship names the way a person names a couple or a
   fandom pairing — by borrowing real *sounds* from both names and joining
   them naturally (Brad + Angelina -> Brangelina, Ben + Jennifer -> Bennifer,
   Kim + Kanye -> Kimye). We never mash random letters and never bolt on
   decorative suffixes (ie / y / boo / pie / love / official). The base blend
   quality is what matters.

   The Relationship/Purpose and Style filters do NOT change the letters of a
   name. They only re-weight scoring and ranking, so different filters surface
   different names from the same pair. The category label is display-only and
   is never spliced into a name.

   Pipeline per request:
     1. analyse both names into reusable sound-parts (onset, head, syllables,
        rime, tails)
     2. build a broad candidate pool with several natural join methods
     3. phonetic repair (smooth ugly consonant / vowel runs)
     4. quality gate (reject unsayable / random / junk candidates)
     5. realism score (pronunciation 40 / connection 30 / feel 20 / unique 10)
     6. filter shaping (style + purpose bonuses re-rank, they never rename)
     7. dedupe + page so "Generate again" reveals the next tier
   ===================================================================== */

(function (global) {
  "use strict";

  const VOWELS = "aeiou";
  const isVowel = (c) => !!c && VOWELS.indexOf(c.toLowerCase()) !== -1;

  const clean = (name) =>
    (name || "")
      .toString()
      .trim()
      .replace(/[^a-zA-Z]/g, "")
      .toLowerCase();

  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const uniq = (arr) => arr.filter((v, i) => v && arr.indexOf(v) === i);

  /* =====================================================================
     STEP 1 — name analysis: pull out the reusable *sounds* of a name.
     ===================================================================== */

  // Leading consonant cluster: "br" (brad), "" (alex), "l" (liam).
  function onset(n) {
    let i = 0;
    while (i < n.length && !isVowel(n[i])) i++;
    return n.slice(0, i);
  }

  // From the first vowel to the end: "angelina" (angelina), "ermione" (hermione).
  function rime(n) {
    let i = 0;
    while (i < n.length && !isVowel(n[i])) i++;
    return n.slice(i) || n;
  }

  // First open syllable: onset + first vowel group. "ha" (harry), "lia" (liam).
  function firstSyl(n) {
    let i = 0;
    while (i < n.length && !isVowel(n[i])) i++; // consonant onset
    while (i < n.length && isVowel(n[i])) i++; // vowel group
    return n.slice(0, i) || n.slice(0, 2);
  }

  // Last syllable: one consonant + final vowel group (+ trailing consonants).
  // "ma" (emma), "via" (olivia), "na" (selena), "fer" (jennifer).
  function lastSyl(n) {
    if (n.length <= 2) return n;
    let i = n.length - 1;
    while (i > 0 && !isVowel(n[i])) i--; // skip trailing consonants to last vowel
    while (i > 0 && isVowel(n[i - 1])) i--; // to start of final vowel group
    if (i > 0 && !isVowel(n[i - 1])) i--; // include one leading consonant
    return n.slice(i) || n;
  }

  // Last two syllables: "lena" (selena), "mione" (hermione), "livia" (olivia).
  function last2Syl(n) {
    const l1 = lastSyl(n);
    const rest = n.slice(0, n.length - l1.length);
    if (!rest) return l1;
    return lastSyl(rest) + l1;
  }

  const head = (n, k) => n.slice(0, k);
  const tail = (n, k) => n.slice(-k);

  // The sound-parts a name can contribute at the FRONT of a blend.
  function prefixParts(n) {
    return uniq([
      onset(n) || head(n, 2),
      head(n, 2),
      head(n, 3),
      firstSyl(n),
      n, // whole name (Kim + ye -> Kimye, Alex + ma -> Alexma)
    ]);
  }

  // The sound-parts a name can contribute at the END of a blend.
  function suffixParts(n) {
    return uniq([
      tail(n, 2),
      tail(n, 3),
      lastSyl(n),
      last2Syl(n),
      rime(n),
    ]);
  }

  // Overlap merge on a shared sound (kept as an extra natural method).
  function overlapMerge(a, b) {
    for (let len = Math.min(a.length, b.length) - 1; len >= 2; len--) {
      if (a.slice(-len) === b.slice(0, len)) return a + b.slice(len);
    }
    for (let i = 2; i < a.length - 1; i++) {
      const idx = b.indexOf(a[i], 1);
      if (idx > 0) return a.slice(0, i) + b.slice(idx);
    }
    return null;
  }

  /* =====================================================================
     STEP 2 — candidate generation: cross the front-sounds of one name with
     the end-sounds of the other. Both orders. Plus syllable pairings and
     overlap merges. Yields ~50-100 raw blends before filtering.
     ===================================================================== */

  function buildCandidates(a, b) {
    const out = [];
    const cross = (name1, name2) => {
      const pre = prefixParts(name1);
      const suf = suffixParts(name2);
      for (const p of pre) for (const s of suf) out.push(p + s);
      // syllable-only pairings (lastSyl + lastSyl gives things like "Lexma")
      out.push(lastSyl(name1) + lastSyl(name2));
      out.push(firstSyl(name1) + lastSyl(name2));
      out.push(firstSyl(name1) + last2Syl(name2));
    };
    cross(a, b);
    cross(b, a);
    out.push(overlapMerge(a, b));
    out.push(overlapMerge(b, a));
    return out;
  }

  /* =====================================================================
     STEP 3 — phonetic repair: smooth the joints so a blend reads naturally.
     ===================================================================== */

  function repair(word) {
    if (!word) return "";
    let w = word.toLowerCase();
    w = w.replace(/([a-z])\1{2,}/g, "$1"); // 3+ same letter -> one
    w = w.replace(/([aeiou])\1+/g, "$1"); // doubled vowels -> one
    w = w.replace(/[bcdfghjklmnpqrstvwxyz]{3,}/g, (m) => m[0] + m[m.length - 1]); // 3+ consonants -> 2
    w = w.replace(/[aeiou]{3,}/g, (m) => m.slice(0, 2)); // 3+ vowels -> 2
    w = w.replace(/^([aeiou])(?=[aeiou])/, ""); // drop floating leading vowel (aemma -> emma)
    w = w.replace(/([bcdfghjklmnpqrstvwxyz])\1$/g, "$1"); // no doubled final consonant
    return w;
  }

  /* =====================================================================
     STEP 4 — quality gate: reject anything unsayable, random, or junky.
     ===================================================================== */

  function pronounceable(w) {
    if (!w || w.length < 4 || w.length > 12) return false; // brief: 4..12 chars
    if (!/[aeiou]/.test(w)) return false;
    if (/[bcdfghjklmnpqrstvwxyz]{3,}/.test(w)) return false; // no 3 consonants together
    if (/[aeiou]{3,}/.test(w)) return false; // no 3 vowels together
    if (/([a-z])\1\1/.test(w)) return false; // no triple letters
    if (/^[bcdfghjklmnpqrstvwxyz]{2}[bcdfghjklmnpqrstvwxyz]/.test(w)) return false;
    if (/(xx|zz|qq|jj|vv|kk|xz|zx|qx)/.test(w)) return false; // password-ish junk
    if (/[jqvw]$/.test(w)) return false; // only truly awkward hard endings (keep x/z/k/h: Alex, Noah)
    // every 3-letter window must contain a vowel (keeps it sayable end-to-end)
    for (let i = 0; i + 3 <= w.length; i++) {
      if (!/[aeiou]/.test(w.slice(i, i + 3))) return false;
    }
    return true;
  }

  // A blend must not simply be one full name, nor both names stuck together.
  function validBlend(w, a, b) {
    if (w === a || w === b) return false;
    if (w.indexOf(a) !== -1 && w.indexOf(b) !== -1) return false; // e.g. "alexemma"
    return true;
  }

  /* =====================================================================
     STEP 5 — realism score (0..100), weighted per the brief:
       pronunciation 40 · name connection 30 · ship-name feel 20 · unique 10
     ===================================================================== */

  const REAL_ENDINGS = [
    "a", "ia", "ie", "el", "en", "ah", "on", "yn", "ra", "na", "li", "ya",
    "ana", "ella", "ina", "elle", "ine", "us", "is", "ova", "ela", "ena",
  ];
  const endsWithAny = (w, list) => list.some((e) => w.endsWith(e));

  // Is a recognizable chunk of `name` visible inside the blend?
  function shares(word, name) {
    if (!name) return false;
    const h2 = head(name, 2), h3 = head(name, 3), t2 = tail(name, 2), t3 = tail(name, 3);
    if (h3.length >= 3 && word.indexOf(h3) !== -1) return true;
    if (t3.length >= 3 && word.indexOf(t3) !== -1) return true;
    if (word.startsWith(h2) || word.endsWith(t2)) return true;
    if (word[0] === name[0] && word.length > 3) return true;
    return false;
  }

  function vowelRatio(w) {
    return (w.match(/[aeiou]/g) || []).length / w.length;
  }

  function score(word, a, b) {
    if (!word) return -1;

    // pronunciation (40) — vowel/consonant alternation, penalise clusters
    let runs = 0, prev = null;
    for (let i = 0; i < word.length; i++) {
      const v = isVowel(word[i]);
      if (v !== prev) runs++;
      prev = v;
    }
    let pron = runs / word.length; // 1 = perfectly alternating
    if (/[bcdfghjklmnpqrstvwxyz]{2}/.test(word)) pron -= 0.12;
    const vr = vowelRatio(word);
    if (vr < 0.3 || vr > 0.7) pron -= 0.1; // too dense / too airy
    pron = Math.max(0, Math.min(1, pron));

    // name connection (30) — recognisable from BOTH source names
    const conn = (shares(word, a) ? 0.5 : 0) + (shares(word, b) ? 0.5 : 0);

    // ship-name feel (20) — flows, lands on a name-like sound, right size
    let feel = 0;
    if (endsWithAny(word, REAL_ENDINGS) || isVowel(word[word.length - 1])) feel += 0.45;
    if (word.length >= 5 && word.length <= 8) feel += 0.35; // sweet spot
    if (!/[bcdfghjklmnpqrstvwxyz]{2}/.test(word)) feel += 0.2; // clean joins
    feel = Math.min(1, feel);

    // uniqueness (10) — a real merge, not a lazy full-name + scrap
    let unique = 1;
    if (word.startsWith(a) && a.length >= 4) unique -= 0.35;
    if (word.startsWith(b) && b.length >= 4) unique -= 0.35;
    unique = Math.max(0, unique);

    return pron * 40 + conn * 30 + feel * 20 + unique * 10;
  }

  /* =====================================================================
     STEP 6 — filter shaping. Style + purpose add scoring BONUSES only; they
     never alter a single letter of a name. Because the bonus profiles differ,
     the same pair ranks differently under different filters — so Cute, Fantasy
     and Baby Name Inspiration surface genuinely different top names.
     ===================================================================== */

  const has = (w, re) => re.test(w);
  const endsVowel = (w) => isVowel(w[w.length - 1]);
  const isShort = (w) => w.length <= 6;
  const isLong = (w) => w.length >= 6;
  const softHeavy = (w) => ((w.match(/[lmn]/g) || []).length >= 1);
  const harsh = (w) => has(w, /[xzqk]/);

  function styleBonus(w, style) {
    switch (style) {
      case "Cute":
        return (isShort(w) ? 8 : -6) + (endsVowel(w) || /y$/.test(w) ? 5 : 0) + (softHeavy(w) ? 4 : 0);
      case "Romantic":
        return (endsWithAny(w, ["a", "ia", "ie", "e", "ella", "ina"]) ? 8 : 0) +
               (vowelRatio(w) >= 0.45 ? 6 : 0) + (w.length >= 5 && w.length <= 8 ? 3 : 0);
      case "Elegant":
        return (isLong(w) ? 8 : -5) +
               (endsWithAny(w, ["a", "ia", "ine", "elle", "ana", "ora", "e"]) ? 6 : 0) +
               (harsh(w) ? -4 : 0);
      case "Funny":
        return (endsWithAny(w, ["o", "oo", "zo", "az"]) ? 8 : 0) +
               (has(w, /([bcdfghjklmnpqrstvwxyz])\1/) ? 5 : 0) + (isShort(w) ? 3 : 0);
      case "Fantasy":
        return (isLong(w) ? 8 : -6) +
               (has(w, /(ae|th|el|wy|ia|yr|ael|iel|or)/) ? 6 : 0) + (harsh(w) ? 2 : 0);
      case "Short & Viral":
        return (w.length <= 6 ? 12 : w.length === 7 ? 5 : -10);
      case "Unique":
        return (has(w, /[xzvy]/) ? 7 : 0) + (endsWithAny(w, REAL_ENDINGS) ? -3 : 5);
      default:
        return 0;
    }
  }

  function purposeBonus(w, purpose) {
    switch (purpose) {
      case "Romantic Couple":
        return (endsVowel(w) ? 7 : 0) + (!has(w, /[bcdfghjklmnpqrstvwxyz]{2}/) ? 5 : 0) +
               (w.length >= 5 && w.length <= 8 ? 3 : 0);
      case "Marriage / Wedding":
        return (isLong(w) ? 8 : -4) +
               (endsWithAny(w, ["a", "ia", "ine", "elle", "ana", "ella"]) ? 6 : 0) + (harsh(w) ? -4 : 0);
      case "Fictional Characters":
        return (w.length >= 5 && w.length <= 9 ? 7 : 0) +
               (endsWithAny(w, ["a", "us", "on", "iel", "yn", "ia"]) ? 5 : 0);
      case "Celebrity Pair":
        return (w.length <= 7 ? 9 : -3) + (!isVowel(w[0]) ? 5 : 2); // punchy, hashtag-friendly
      case "Best Friends":
        return (isShort(w) ? 8 : -3) + (endsWithAny(w, ["y", "ie", "o", "a"]) ? 5 : 0) + (softHeavy(w) ? 3 : 0);
      case "Fantasy Characters":
        return (isLong(w) ? 9 : -6) + (has(w, /(ae|th|wy|iel|ora|yr|ia|ael)/) ? 6 : 0);
      case "Social Media Username":
        return (w.length <= 8 ? 9 : -6) + (!has(w, /[bcdfghjklmnpqrstvwxyz]{2}/) ? 6 : 0) +
               (w.length <= 6 ? 4 : 0);
      case "Baby Name Inspiration":
        return (endsWithAny(w, ["a", "ia", "en", "el", "ah", "on", "ana", "ena", "ina"]) ? 9 : -2) +
               (w.length >= 4 && w.length <= 7 ? 5 : 0) + (harsh(w) ? -4 : 0);
      default:
        return 0;
    }
  }

  /* ---------- category labels for the result cards (display only) ---------- */

  const CATEGORY_LABEL = {
    "Romantic Couple": "Couple",
    "Marriage / Wedding": "Wedding",
    "Fictional Characters": "Fiction",
    "Celebrity Pair": "Celebrity",
    "Best Friends": "Friends",
    "Fantasy Characters": "Fantasy",
    "Social Media Username": "Handle",
    "Baby Name Inspiration": "Baby Name",
  };

  /* ---------- compatibility score (for the fun little meter) ---------- */

  function compatibility(a, b) {
    if (!a || !b) return 0;
    const setA = new Set(a.split(""));
    const setB = new Set(b.split(""));
    let shared = 0;
    setA.forEach((c) => { if (setB.has(c)) shared++; });
    const union = new Set(a.split("").concat(b.split(""))).size || 1;
    const overlap = shared / union;
    const vowelsA = (a.match(/[aeiou]/g) || []).length / a.length;
    const vowelsB = (b.match(/[aeiou]/g) || []).length / b.length;
    const vowelHarmony = 1 - Math.abs(vowelsA - vowelsB);
    const lenHarmony = 1 - Math.abs(a.length - b.length) / Math.max(a.length, b.length);
    const raw = overlap * 0.4 + vowelHarmony * 0.35 + lenHarmony * 0.25;
    const sc = Math.round(62 + raw * 37);
    return Math.max(62, Math.min(99, sc));
  }

  function compatLabel(sc) {
    if (sc >= 92) return "A perfect match";
    if (sc >= 82) return "Seriously strong chemistry";
    if (sc >= 72) return "A sweet, easy match";
    return "A cute pairing with potential";
  }

  /* ---------- light diversity: drop only near-identical stems ---------- */

  function diversify(sorted) {
    const picked = [];
    const stems = new Set();
    for (const item of sorted) {
      const stem = item.key.slice(0, 5); // same first 5 letters = too alike
      if (stems.has(stem)) continue;
      stems.add(stem);
      picked.push(item);
    }
    // top up with the remainder so we never run short
    if (picked.length < sorted.length) {
      for (const item of sorted) {
        if (picked.indexOf(item) === -1) picked.push(item);
      }
    }
    return picked;
  }

  /* =====================================================================
     Main entry point — unchanged public shape:
       generate({ name1, name2, category, style, count, batch })
       -> { ok, results:[{name,label,score}], compatibility:{score,label} }
     ===================================================================== */

  function generate(opts) {
    opts = opts || {};
    const a = clean(opts.name1);
    const b = clean(opts.name2);
    const style = opts.style || "Cute";
    const category = opts.category || "Romantic Couple";
    const count = opts.count || 7;
    const batch = Math.max(0, opts.batch | 0);

    if (a.length < 1 || b.length < 1) {
      return { ok: false, error: "Please enter two names.", results: [] };
    }

    const sc = compatibility(a, b);
    const label = CATEGORY_LABEL[category] || "Ship";

    // Build, repair, gate, score.
    const seen = new Set();
    const scored = [];
    for (const raw of buildCandidates(a, b)) {
      if (!raw) continue;
      const w = repair(raw);
      if (!pronounceable(w)) continue;
      if (!validBlend(w, a, b)) continue;
      if (seen.has(w)) continue;
      seen.add(w);

      const q = score(w, a, b) + styleBonus(w, style) + purposeBonus(w, category);
      scored.push({ name: cap(w), key: w, score: Math.max(40, Math.min(98, Math.round(q))), q: q });
    }

    // Rank best-first, keep variety, then page so "Generate again" shows more.
    scored.sort((x, y) => y.q - x.q);
    const ranked = diversify(scored);

    let start = ranked.length ? (batch * count) % ranked.length : 0;
    let page = ranked.slice(start, start + count);
    if (page.length < count) page = page.concat(ranked.slice(0, count - page.length));

    const results = page.map((x) => ({ name: x.name, label: label, score: x.score }));

    return {
      ok: true,
      results: results,
      compatibility: { score: sc, label: compatLabel(sc) },
    };
  }

  global.ShipNameGenerator = { generate: generate };
})(window);
