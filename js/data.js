/* Deck construction, filtering, and language-pair state changes */

function jlptItemsForLevels(levelValue) {
  const data = typeof DATA !== "undefined" ? DATA : {};
  const parts = String(levelValue || "n5+n4+n3+n2+n1").split("+");
  let items = [];
  parts.forEach(key => { items = items.concat(data[key] || []); });
  return items;
}

function allItems() {
  return jlptItemsForLevels($("lv").value);
}

function activeLevelKeys() {
  return String($("lv").value || "n5+n4+n3+n2+n1").split("+");
}

function normalizeCat(c) {
  c = (c || "").replace(/^N[2-5]\s*/, "").replace(/\s+in\s+N[2-5]$/, "").replace(/^—\s*/, "");
  return CAT_MAP[c] || c;
}

function getLangConfig() {
  return LANGUAGES[selectedLang] || LANGUAGES[DEFAULT_LANG];
}

function getMeaningText(w) {
  const cfg = getLangConfig();
  return (w[cfg.field] || "").trim() || w.m || "";
}

function getMeaningTextClass() {
  return getLangConfig().textClass;
}

function getLangLabel() {
  return getLangConfig().label;
}

function jlptSideFromCsv(w, langCode) {
  const cfg = LANGUAGES[langCode] || LANGUAGES[DEFAULT_LANG];
  const text = getMeaningText(w);
  return {
    code: langCode,
    label: cfg.label,
    name: cfg.label,
    locale: cfg.langCode,
    dir: "ltr",
    rtl: false,
    terms: [{ w: text, r: "", k: "", g: "" }],
    word: text,
    reading: "",
    gender: "",
    alternates: [],
    speakText: stripTilde(text),
    searchText: normalizeSearch(text),
    fallback: !((w[cfg.field] || "").trim()),
  };
}

function buildJlptCards() {
  const meaningLanguage = getLangConfig();
  return jlptItemsForLevels("n5+n4+n3+n2+n1").map(w => {
    const level = String(w.lv || "").toLowerCase();
    const category = normalizeCat(w.c || "") || "General";
    const back = jlptSideFromCsv(w, selectedLang);
    const front = {
      code: "ja",
      label: "日本語",
      name: "Japanese",
      locale: "ja-JP",
      dir: "ltr",
      rtl: false,
      terms: [{ w: w.w || "", r: w.ro || "", k: w.r || "", g: "" }],
      word: w.w || "",
      reading: [w.r, w.ro].filter(Boolean).join(" · "),
      gender: "",
      alternates: [],
      speakText: stripTilde(w.r || w.w || ""),
      searchText: normalizeSearch([w.w, w.r, w.ro].join(" ")),
      fallback: false,
    };
    const allMeanings = Object.keys(LANGUAGES)
      .map(code => w[LANGUAGES[code].field] || "")
      .join(" ");
    return {
      id: "jlpt-" + w.n,
      mode: "jlpt",
      front: front,
      back: back,
      pos: w.p || "",
      category: category,
      level: level,
      levelClass: level,
      badge: w.lv || "JLPT",
      badgeClass: level,
      contextTitle: category,
      contextText: "JLPT " + (w.lv || "") + " · " + meaningLanguage.label + " meaning",
      sourceLabel: "Vocabulary.csv",
      sourceUrl: "Vocabulary.csv",
      sourceNote: "Legacy JLPT deck",
      pairLabel: "日本語 → " + meaningLanguage.label,
      searchText: normalizeSearch([
        w.w, w.r, w.ro, w.p, w.lv, category, allMeanings,
      ].join(" ")),
    };
  });
}

function fillCats() {
  const levels = activeLevelKeys();
  const catSet = new Set();
  allCards.forEach(card => {
    if (deckMode === "jlpt" && !levels.includes(card.level)) return;
    if (card.category) catSet.add(card.category);
  });
  const cats = [...catSet].sort((a, b) => a.localeCompare(b));
  const select = $("cat");
  const current = select.value;
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "All categories";
  select.appendChild(all);
  cats.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
  select.value = cats.includes(current) ? current : "";
}

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function filter() {
  const query = normalizeSearch($("q").value);
  const category = $("cat").value;
  const levels = activeLevelKeys();
  let items = allCards;

  if (deckMode === "jlpt") {
    items = items.filter(card => levels.includes(card.level));
  }
  if (category) {
    items = items.filter(card => card.category === category);
  }
  if (query) {
    items = items.filter(card => (card.searchText || "").includes(query));
  }

  pool = shuffled ? shuffle(items) : items;
  visibleLimit = VISIBLE_CARD_STEP;
  selectedCardIndex = 0;
  autoplayIndex = 0;
  if (autoplayActive) stopAutoplay();
  render();
  if ($("fsOverlay").classList.contains("on")) renderFSCard();
}

async function refreshDeck() {
  const token = ++deckLoadToken;
  stopAutoplay();
  selectedCardIndex = 0;
  autoplayIndex = 0;
  visibleLimit = VISIBLE_CARD_STEP;
  allCards = [];
  pool = [];
  setModeVisibility();
  updateVoiceSelects();

  if (deckMode === "dictionary") {
    if (!DICT_META) {
      $("list").innerHTML = '<div class="empty">Dictionary metadata is missing. Run <code>python3 scripts/build_dictionary_packs.py</code>.</div>';
      setStatus("Dictionary data unavailable");
      renderDataNote();
      return;
    }
    if (sourceLang === targetLang) {
      const alternatives = dictionaryLanguageRecords().map(item => item.code);
      targetLang = alternatives.find(code => code !== sourceLang) || DEFAULT_TARGET_LANG;
      $("targetLang").value = targetLang;
    }
    const from = dictionaryLanguage(sourceLang);
    const to = dictionaryLanguage(targetLang);
    setStatus("Loading local dictionary packs: " + from.name + " → " + to.name + "…");
    $("list").innerHTML = '<div class="loading">Loading human-edited dictionary entries…</div>';
    try {
      await Promise.all([loadDictionaryPack(sourceLang), loadDictionaryPack(targetLang)]);
      if (token !== deckLoadToken) return;
      allCards = buildDictionaryCards(sourceLang, targetLang);
    } catch (error) {
      if (token !== deckLoadToken) return;
      console.error(error);
      $("list").innerHTML = '<div class="empty">Could not load the local dictionary packs.<br><small>' +
        escapeHtml(error.message) + '</small></div>';
      setStatus("Dictionary pack load failed");
      renderDataNote();
      return;
    }
  } else {
    allCards = buildJlptCards();
  }

  fillCats();
  filter();
  updateVoiceSelects();
  renderDataNote();
}
