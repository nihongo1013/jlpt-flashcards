/* Offline, sense-aligned dictionary packs.
 *
 * A pack is generated from human-edited Wiktionary translation tables. Each
 * entry has a concept index and one or more dictionary-attested terms. Cards
 * are created only when the SAME concept exists in both selected packs. There
 * is no translation call and no pivot through a generated translation.
 */
const DICT_META = window.DICTIONARY_META || null;
const DICT_PACKS = window.DICTIONARY_PACKS || (window.DICTIONARY_PACKS = {});

const dictionaryLanguageMap = new Map(
  (DICT_META && DICT_META.languages ? DICT_META.languages : []).map(item => [item.code, item])
);
const dictionaryCategoryMap = new Map(
  (DICT_META && DICT_META.categories ? DICT_META.categories : []).map(item => [item.id, item.label])
);

function dictionaryLanguageRecords() {
  return DICT_META && Array.isArray(DICT_META.languages) ? DICT_META.languages : [];
}

function dictionaryRegionLabels() {
  const out = {};
  if (DICT_META && Array.isArray(DICT_META.regions)) {
    DICT_META.regions.forEach(region => { out[region.id] = region.label; });
  }
  return out;
}

function dictionaryLanguage(code) {
  return dictionaryLanguageMap.get(code) || {
    code: code,
    name: code,
    native: code,
    locale: code,
    rtl: false,
    region: "other",
  };
}

function dictionaryCategoryLabel(id) {
  return dictionaryCategoryMap.get(id) || id || "General";
}

function populateLanguageSelect(select, selectedCode) {
  if (!select) return;
  select.innerHTML = "";
  const records = dictionaryLanguageRecords();
  if (!records.length) {
    const option = document.createElement("option");
    option.value = DEFAULT_SOURCE_LANG;
    option.textContent = "Dictionary metadata unavailable";
    select.appendChild(option);
    return;
  }

  const labels = dictionaryRegionLabels();
  const popularCodes = typeof POPULAR_LANGUAGE_CODES !== "undefined" ? POPULAR_LANGUAGE_CODES : [];
  const popularSet = new Set(popularCodes);
  const byCode = new Map(records.map(item => [item.code, item]));
  const makeOption = item => {
    const option = document.createElement("option");
    option.value = item.code;
    option.textContent = item.native && item.native !== item.name
      ? item.name + " · " + item.native
      : item.name;
    return option;
  };

  // Put widely used languages first, without duplicating them in the
  // regional groups. Every one of the 109 languages stays selectable.
  const popularGroup = document.createElement("optgroup");
  popularGroup.label = "Popular languages";
  popularCodes.forEach(code => {
    const item = byCode.get(code);
    if (item) popularGroup.appendChild(makeOption(item));
  });
  if (popularGroup.children.length) select.appendChild(popularGroup);

  const groups = new Map();
  const orderedRegions = (DICT_META && DICT_META.regions ? DICT_META.regions : [])
    .map(region => region.id)
    .concat(["other"]);
  orderedRegions.forEach(id => {
    const group = document.createElement("optgroup");
    group.label = "More · " + (labels[id] || "Other");
    groups.set(id, group);
  });

  records.forEach(item => {
    if (popularSet.has(item.code)) return;
    const group = groups.get(item.region) || groups.get("other");
    group.appendChild(makeOption(item));
  });
  groups.forEach(group => { if (group.children.length) select.appendChild(group); });
  select.value = dictionaryLanguageMap.has(selectedCode) ? selectedCode : records[0].code;
}

function loadDictionaryPack(code) {
  if (DICT_PACKS[code]) return Promise.resolve(DICT_PACKS[code]);
  if (packLoadPromises[code]) return packLoadPromises[code];
  if (!DICT_META || !DICT_META.packs || !DICT_META.packs[code]) {
    return Promise.reject(new Error("No dictionary pack is registered for " + code));
  }

  packLoadPromises[code] = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const path = (DICT_META.packs[code] || {}).path || ("packs/" + code + ".js");
    script.src = "data/dictionary/" + path;
    script.async = true;
    script.dataset.dictionaryPack = code;
    script.onload = () => {
      if (DICT_PACKS[code]) resolve(DICT_PACKS[code]);
      else reject(new Error("Dictionary pack loaded but did not register: " + code));
    };
    script.onerror = () => {
      delete packLoadPromises[code];
      reject(new Error("Could not load local dictionary pack: " + code));
    };
    document.head.appendChild(script);
  });
  return packLoadPromises[code];
}

function decodeTerm(values) {
  const term = Array.isArray(values) ? values : [values];
  return {
    w: String(term[0] || ""),
    r: String(term[1] || ""),     // romanization supplied by the dictionary
    k: String(term[2] || ""),     // kana/phonetic reading when supplied
    g: String(term[3] || ""),     // grammatical gender tag when supplied
  };
}

function readingFor(term) {
  if (term.k && term.r && term.k !== term.r) return term.k + " · " + term.r;
  return term.k || term.r || "";
}

function genderLabel(code) {
  if (!code) return "";
  return (DICT_META && DICT_META.genderLabels ? DICT_META.genderLabels[code] : null) || code;
}

function dictionarySide(code, packedTerms) {
  const language = dictionaryLanguage(code);
  const terms = (packedTerms || []).map(decodeTerm).filter(term => term.w);
  const primary = terms[0] || { w: "", r: "", k: "", g: "" };
  const allText = terms
    .map(term => [term.w, term.r, term.k].filter(Boolean).join(" "))
    .join(" ");
  return {
    code: code,
    label: language.native || language.name,
    name: language.name,
    locale: language.locale || code,
    dir: language.rtl ? "rtl" : "ltr",
    rtl: !!language.rtl,
    terms: terms,
    word: primary.w,
    reading: readingFor(primary),
    gender: genderLabel(primary.g),
    alternates: terms.slice(1).map(term => term.w),
    speakText: stripTilde(primary.k || primary.w),
    searchText: normalizeSearch([
      allText,
      language.name,
      language.native,
      language.code,
    ].join(" ")),
  };
}

function conceptRecord(index) {
  const row = DICT_META && DICT_META.concepts ? DICT_META.concepts[index] : null;
  if (!row) return null;
  return {
    slug: row[0],
    word: row[1],
    pos: row[2],
    categoryId: row[3],
    gloss: row[4],
    definition: row[5],
    sourceUrl: row[6],
  };
}

function buildDictionaryCards(fromCode, toCode) {
  const fromPack = DICT_PACKS[fromCode];
  const toPack = DICT_PACKS[toCode];
  if (!fromPack || !toPack) return [];
  const toEntries = new Map(toPack.entries || []);
  const fromLanguage = dictionaryLanguage(fromCode);
  const toLanguage = dictionaryLanguage(toCode);
  const cards = [];

  (fromPack.entries || []).forEach(([conceptIndex, fromTerms]) => {
    const toTerms = toEntries.get(conceptIndex);
    if (!toTerms) return;
    const concept = conceptRecord(conceptIndex);
    if (!concept) return;
    const category = dictionaryCategoryLabel(concept.categoryId);
    const front = dictionarySide(fromCode, fromTerms);
    const back = dictionarySide(toCode, toTerms);
    cards.push({
      id: "dict-" + conceptIndex,
      mode: "dictionary",
      front: front,
      back: back,
      pos: concept.pos,
      category: category,
      level: "",
      levelClass: "",
      badge: category,
      badgeClass: "category-tag",
      contextTitle: concept.gloss || concept.word,
      contextText: concept.definition,
      sourceLabel: "Wiktionary",
      sourceUrl: concept.sourceUrl,
      sourceNote: "Human-edited dictionary sense",
      pairLabel: (fromLanguage.native || fromLanguage.name) + " → " + (toLanguage.native || toLanguage.name),
      searchText: normalizeSearch([
        concept.word,
        concept.gloss,
        concept.definition,
        concept.pos,
        category,
        fromLanguage.name,
        toLanguage.name,
        front.searchText,
        back.searchText,
      ].join(" ")),
    });
  });
  return cards;
}
