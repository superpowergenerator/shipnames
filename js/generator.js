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
      head(n, 4), // "bran" (brad) -> Brangelina = bran + gelina
      firstSyl(n),
      n, // whole name (Kim + ye -> Kimye, Alex + ma -> Alexma)
    ]);
  }

  // The sound-parts a name can contribute at the END of a blend.
  function suffixParts(n) {
    return uniq([
      tail(n, 2),
      tail(n, 3),
      tail(n, 4),
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

  // Each candidate carries the join method that built it, so the UI can
  // explain every name truthfully ("Bra + ngelina · Start + end").
  function buildCandidates(a, b) {
    const out = [];
    const cross = (name1, name2) => {
      const pre = prefixParts(name1);
      const suf = suffixParts(name2);
      for (const p of pre) for (const s of suf) out.push({ word: p + s, method: "Start + end" });
      // syllable-only pairings (lastSyl + lastSyl gives things like "Lexma")
      out.push({ word: lastSyl(name1) + lastSyl(name2), method: "Syllable swap" });
      out.push({ word: firstSyl(name1) + lastSyl(name2), method: "Syllable swap" });
      out.push({ word: firstSyl(name1) + last2Syl(name2), method: "Syllable swap" });
    };
    cross(a, b);
    cross(b, a);
    // Substring crossing: any chunk of one name + any chunk of the other.
    // This is what finds blends the fixed part-lists miss (e.g. "lex" + "lex"
    // for two identical names). The quality gate below does the filtering.
    const subCross = (n1, n2) => {
      for (let i = 0; i < n1.length; i++) {
        for (let j = i + 2; j <= n1.length; j++) {
          const f = n1.slice(i, j);
          for (let k = 0; k < n2.length; k++) {
            for (let l = k + 2; l <= n2.length; l++) {
              out.push({ word: f + n2.slice(k, l), method: "Start + end" });
            }
          }
        }
      }
    };
    subCross(a, b);
    subCross(b, a);
    const om1 = overlapMerge(a, b);
    if (om1) out.push({ word: om1, method: "Shared sound" });
    const om2 = overlapMerge(b, a);
    if (om2) out.push({ word: om2, method: "Shared sound" });
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

  // English word-initial consonant clusters that can actually be said.
  // Anything else starting with two consonants (e.g. "hm" in Hmione, "tv"
  // in Tvis) is unpronounceable and is rejected.
  const ALLOWED_ONSETS = new Set([
    "br", "bl", "cr", "cl", "dr", "fl", "fr", "gl", "gr", "pl", "pr",
    "tr", "st", "sp", "sc", "sh", "ch", "th", "wh", "ph", "sm", "sn",
    "sw", "tw", "qu", "str", "spr", "scr", "spl", "chr", "sch", "thr",
  ]);

  function pronounceable(w) {
    if (!w || w.length < 4 || w.length > 12) return false; // brief: 4..12 chars
    if (!/[aeiou]/.test(w)) return false;
    if (/[bcdfghjklmnpqrstvwxyz]{3,}/.test(w)) return false; // no 3 consonants together
    if (/[aeiou]{3,}/.test(w)) return false; // no 3 vowels together
    if (/([a-z])\1\1/.test(w)) return false; // no triple letters
    if (/^[bcdfghjklmnpqrstvwxyz]{2}[bcdfghjklmnpqrstvwxyz]/.test(w)) return false;
    // A blend must not START with an unpronounceable consonant cluster.
    const start2 = w.slice(0, 2);
    if (/^[bcdfghjklmnpqrstvwxyz]{2}/.test(w) && !ALLOWED_ONSETS.has(start2)) return false;
    if (/(xx|zz|qq|jj|vv|kk|xz|zx|qx)/.test(w)) return false; // password-ish junk
    if (/[jqvw]$/.test(w)) return false; // only truly awkward hard endings (keep x/z/k/h: Alex, Noah)
    // every 3-letter window must contain a vowel (keeps it sayable end-to-end)
    for (let i = 0; i + 3 <= w.length; i++) {
      if (!/[aeiou]/.test(w.slice(i, i + 3))) return false;
    }
    return true;
  }

  // A blend must genuinely come from BOTH names: it must split into a front
  // part (at least 2 letters) that occurs in one name and a back part
  // (at least 2 letters) that occurs in the other, covering at least
  // `minTotal` letters in total. This rejects one-letter contributions
  // ("Hone": only "h" from Harry) and too-thin blends ("Hane": 2 + 2).
  // When both names are the same (Alex + Alex), both parts must occur in
  // that one name instead.
  function contributionOk(w, a, b, minTotal) {
    const splitOk = (x, y) => {
      for (let k = 2; k <= w.length - 2; k++) {
        const front = w.slice(0, k);
        const back = w.slice(k);
        if (front.length + back.length < minTotal) continue;
        if (x.indexOf(front) !== -1 && y.indexOf(back) !== -1) return true;
      }
      return false;
    };
    if (a === b) return splitOk(a, a);
    return splitOk(a, b) || splitOk(b, a);
  }

  // A blend must not simply be one full name, nor both names stuck together.
  function validBlend(w, a, b) {
    if (w === a || w === b) return false;
    // Same name twice (Alex + Alex): "contains the name" is meaningless,
    // since every blend is built from that one name. Only the exact name
    // itself, and the name simply repeated (Alexalex), are rejected.
    if (a === b) return w !== a + a;
    if (w.indexOf(a) !== -1 && w.indexOf(b) !== -1) return false; // e.g. "alexemma"
    return true;
  }

  // Explain a finished blend from its own letters: find the split where the
  // front part occurs in one source name and the back part in the other.
  // Anchored splits (front is a prefix of its name, back is a suffix of the
  // other) win, then splits whose front is near 3 letters — the shape of
  // the famous joins (Bra + ngelina, Kim + ye). The method label describes
  // the actual split: where each part sits in its source name (Start, End,
  // or Middle), so "Em + ale" reads "Start + start" instead of claiming
  // "ale" is the end of Alex. Returns {front, back, method} or null when
  // no honest split exists; the caller then shows the build method label
  // on its own instead of inventing pieces.
  function explainSplit(w, a, b) {
    let best = null;
    let bestScore = -Infinity;
    const partPos = (part, name) => {
      if (name.startsWith(part)) return "Start";
      if (name.endsWith(part)) return "End";
      return "Middle";
    };
    const consider = (x, y) => {
      for (let k = 2; k <= w.length - 2; k++) {
        const front = w.slice(0, k);
        const back = w.slice(k);
        if (x.indexOf(front) === -1 || y.indexOf(back) === -1) continue;
        const anchored = x.startsWith(front) && y.endsWith(back);
        const score = (anchored ? 100 : 0) - Math.abs(front.length - 3) * 10 + back.length;
        if (score > bestScore) {
          bestScore = score;
          best = { front: front, back: back, method: partPos(front, x) + " + " + partPos(back, y).toLowerCase() };
        }
      }
    };
    consider(a, b);
    consider(b, a);
    return best;
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
    // Sweet spot is relative to the source names: a blend of two long
    // names may legitimately be longer (Brangelina is 10 letters because
    // Angelina is 8). A fixed 5-8 cap would punish exactly those blends.
    const maxSrc = Math.max(a.length, b.length);
    if (word.length >= 5 && word.length <= Math.max(8, maxSrc + 2)) feel += 0.35;
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
     STEP 6 — filter shaping. Style + purpose are scored as a MATCH, not a
     small nudge: a name that fits the chosen style/purpose gets a bonus
     (+25 strong, +10 partial), and a name that clearly fights it gets a
     penalty (-10). This is large enough to reorder the top 7, so
     different filters surface genuinely different names from the same
     pair instead of the same list in a slightly different order. The
     bonuses never alter a single letter of a name.
     ===================================================================== */

  const has = (w, re) => re.test(w);
  const endsVowel = (w) => isVowel(w[w.length - 1]);
  const isShort = (w) => w.length <= 6;
  const isLong = (w) => w.length >= 6;
  const softHeavy = (w) => ((w.match(/[lmn]/g) || []).length >= 1);
  const harsh = (w) => has(w, /[xzqk]/);

  // Returns 2 (strong match), 1 (partial), 0 (no match) or -1 (clear mismatch).
  // Strong matches are judged mainly on the name's ENDING and sound
  // pattern (the filter's essence), not on a strict length, so a famous
  // long blend like Brangelina still matches Cute/Romantic (it ends in
  // "a"). Only Short & Viral is defined by length, so only it penalises
  // long names.
  function styleMatch(w, style) {
    const len = w.length;
    const endsV = endsVowel(w);
    const vr = vowelRatio(w);
    switch (style) {
      case "Cute":
        // Short is cute too: a 6-letter blend that ends in a consonant
        // (Tayvis) is just as cute as one that ends in a vowel. Judging
        // Cute only by the ending pushed famous blends down.
        if (endsV || /y$/.test(w) || len <= 6) return 2;
        if (len <= 8 || vr >= 0.4) return 1;
        return 0;
      case "Romantic":
        if (endsWithAny(w, ["a", "ia", "ie", "e", "ella", "ina"])) return 2;
        if (vr >= 0.45 || (len >= 5 && len <= 8)) return 1;
        return 0;
      case "Elegant":
        if (len >= 6 && endsWithAny(w, ["a", "ia", "ine", "elle", "ana", "ora", "e"])) return 2;
        if (endsWithAny(w, ["a", "ia", "ine", "elle", "ana", "ora", "e"]) || len >= 7) return 1;
        return 0;
      case "Funny":
        if (endsWithAny(w, ["o", "oo", "zo", "az"]) || /([bcdfghjklmnpqrstvwxyz])\1/.test(w)) return 2;
        if (len <= 6) return 1;
        return 0;
      case "Fantasy":
        if (len >= 6 && /(ae|th|el|wy|ia|yr|ael|iel|or)/.test(w)) return 2;
        if (/(ae|th|el|wy|ia|yr|ael|iel|or)/.test(w)) return 1;
        return 0;
      case "Short & Viral":
        if (len <= 6) return 2;
        if (len === 7) return 1;
        return -1; // too long for a short viral name
      case "Unique":
        if (/[xzvy]/.test(w)) return 2;
        if (/[qjk]/.test(w) || len <= 5) return 1;
        return 0;
      default:
        return 0;
    }
  }

  function purposeMatch(w, purpose) {
    const len = w.length;
    const endsV = endsVowel(w);
    switch (purpose) {
      case "Romantic Couple":
        if (endsV) return 2;
        if (len >= 5 && len <= 8) return 1;
        return 0;
      case "Marriage / Wedding":
        if (len >= 6 && endsWithAny(w, ["a", "ia", "ine", "elle", "ana", "ella"])) return 2;
        if (endsWithAny(w, ["a", "ia", "ine", "elle", "ana", "ella"])) return 1;
        return 0;
      case "Fictional Characters":
        if (len >= 5 && endsWithAny(w, ["a", "us", "on", "iel", "yn", "ia"])) return 2;
        if (len >= 5 && len <= 9) return 1;
        return 0;
      case "Celebrity Pair":
        if (len <= 7 && !isVowel(w[0])) return 2;
        if (len <= 7) return 1;
        return 0;
      case "Best Friends":
        if (len <= 6 && endsWithAny(w, ["y", "ie", "o", "a"])) return 2;
        if (len <= 6 || endsWithAny(w, ["y", "ie", "o", "a"])) return 1;
        return 0;
      case "Fantasy Characters":
        if (len >= 6 && /(ae|th|wy|iel|ora|yr|ia|ael)/.test(w)) return 2;
        if (/(ae|th|wy|iel|ora|yr|ia|ael)/.test(w)) return 1;
        return 0;
      case "Social Media Username":
        if (len <= 8 && !/[bcdfghjklmnpqrstvwxyz]{2}/.test(w)) return 2;
        if (len <= 8) return 1;
        return -1; // too long for a handle
      case "Baby Name Inspiration":
        // A baby-name blend must be short and name-like: the ending alone
        // is not enough, because every "-lina" blend ends in "ina" and
        // would match Baby Name just as strongly as Romantic Couple.
        // Requiring length 4-7 for a strong match lets the short names
        // (Braina, Brana, Adina) rise above the long "-lina" blends.
        if (endsWithAny(w, ["a", "ia", "en", "el", "ah", "on", "ana", "ena", "ina"]) && len >= 4 && len <= 7) return 2;
        if (endsWithAny(w, ["a", "ia", "en", "el", "ah", "on", "ana", "ena", "ina"]) || (len >= 4 && len <= 7)) return 1;
        if (/[bcdfghjklmnpqrstvwxyz]$/.test(w)) return -1; // ends in a hard consonant, not a baby name
        return 0;
      default:
        return 0;
    }
  }

  function filterBonus(w, style, category) {
    const toPts = (m) => (m === 2 ? 25 : m === 1 ? 10 : m === -1 ? -10 : 0);
    // The purpose (category) weighs double the style: switching the
    // purpose must visibly change the names, not just relabel them.
    return toPts(styleMatch(w, style)) + 2 * toPts(purposeMatch(w, category));
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
       -> { ok, results:[{name,label,score,explain:{pieces,method}}], compatibility:{score,label} }
     ===================================================================== */

  function generate(opts) {
    opts = opts || {};
    const a = clean(opts.name1);
    const b = clean(opts.name2);
    const style = opts.style || "Cute";
    const category = opts.category || "Romantic Couple";
    const count = opts.count || 7;
    const batch = Math.max(0, opts.batch | 0);

    if (a.length < 2 || b.length < 2) {
      return { ok: false, error: "Please enter two names with at least 2 letters each.", results: [] };
    }

    const sc = compatibility(a, b);
    const label = CATEGORY_LABEL[category] || "Ship";

    // Build, repair, gate, score.
    // Dedupe on a "squashed" key (doubled letters collapsed) so near-identical
    // twins such as Alemma / Alema or Emmex / Emex never appear together.
    const squash = (w) => w.replace(/([a-z])\1+/g, "$1");
    const seen = new Set();
    const scored = []; // strict tier: real contribution from both names
    const loose = []; // fallback tier: thinner blends, used only if the strict pool runs short
    for (const raw of buildCandidates(a, b)) {
      if (!raw || !raw.word) continue;
      const w = repair(raw.word);
      const method = raw.method || "Start + end";
      if (!pronounceable(w)) continue;
      if (!validBlend(w, a, b)) continue;
      const key = squash(w);
      if (seen.has(key)) continue;
      seen.add(key);

      // Anchoring bonus: a real ship name starts with the START of one name
      // and ends with the END of the other (Brangelina, Kimye, Tayvis).
      // Mid-name fragments ("Radina", "Inara", "Adeli") pass the
      // contribution test but feel random, so they rank below anchored blends.
      let anchor = 0;
      for (const [x, y] of [[a, b], [b, a]]) {
        let s = 0;
        if (w.startsWith(x.slice(0, 3))) s += 15;
        else if (w.startsWith(x.slice(0, 2))) s += 8;
        if (w.endsWith(y.slice(-3))) s += 10;
        else if (w.endsWith(y.slice(-2))) s += 5;
        // Strong anchor: starts with the first 3 letters of one name AND
        // ends with the last 3 letters of the other. That is the shape of
        // the famous blends (Brangelina = bra + lina, Tayvis = tay + vis),
        // and it must outrank mid-name fragments even when the fragment
        // scores well on length and vowel alternation alone.
        if (w.startsWith(x.slice(0, 3)) && w.endsWith(y.slice(-3))) s += 45;
        anchor = Math.max(anchor, s);
      }
      const split = explainSplit(w, a, b);
      // Coverage bonus: reward blends that keep a substantial chunk of BOTH
      // names. Brangelina keeps 4 letters from Brad and 6 from Angelina;
      // a thin splice like "Braina" keeps only 3 + 3 and feels generic,
      // so the famous shape must outrank it.
      let coverage = 0;
      if (split) {
        if (split.front.length >= 3 && split.back.length >= 4) coverage += 10;
        if (split.front.length >= 4 && split.back.length >= 5) coverage += 10;
      }
      // Concatenation penalty: a blend that is just one full name plus a
      // scrap of the other (Johmary, Maryohn) is not a blend. Penalise it
      // unless the blend is short (Kimye keeps "Kim" but is only 5 letters).
      let concat = 0;
      if (w.length > 6) {
        if (w.indexOf(a) !== -1 || w.indexOf(b) !== -1) concat -= 15;
      }
      const q = score(w, a, b) + filterBonus(w, style, category) + anchor + coverage + concat;
      const explain = split
        ? { pieces: cap(split.front) + " + " + split.back, method: split.method }
        : { pieces: null, method: method };
      const item = { name: cap(w), key: w, score: Math.max(40, Math.min(98, Math.round(q))), q: q, explain: explain };
      if (contributionOk(w, a, b, 5)) scored.push(item);
      else if (contributionOk(w, a, b, 4)) loose.push(item);
    }

    // Rank best-first, keep variety, then page so "Generate again" shows
    // the next tier. Strict names come first; loose names only top up.
    scored.sort((x, y) => y.q - x.q);
    loose.sort((x, y) => y.q - x.q);
    const ranked = diversify(scored).concat(
      diversify(loose).filter((x) => scored.indexOf(x) === -1)
    );

    // Non-overlapping pages: batch N never repeats a name from an earlier
    // batch in the same cycle. Once every name has been shown, the cycle
    // restarts from the top instead of wrapping mid-page with duplicates.
    const pages = Math.max(1, Math.ceil(ranked.length / count));
    const pageIdx = batch % pages;
    const page = ranked.slice(pageIdx * count, pageIdx * count + count);

    const results = page.map((x) => ({ name: x.name, label: label, score: x.score, explain: x.explain }));

    return {
      ok: true,
      results: results,
      compatibility: { score: sc, label: compatLabel(sc) },
    };
  }

  global.ShipNameGenerator = { generate: generate };
})(window);
