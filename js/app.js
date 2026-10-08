/* ============================================================
   NIHONGO 1013 — JLPT Flashcards  (js/app.js)
   Main application logic — modular, multi-language ready
   ============================================================ */

const $ = id => document.getElementById(id);
const list = $("list");

/* ─── Language Configuration ─────────────────────────────────── */
const LANGUAGES = {
  en: { label: "English",  langCode: "en-US", field: "m",  textClass: "en-t", voiceSelectId: "meaningVoice", icon: "🇬🇧" },
  hi: { label: "हिंदी",     langCode: "hi-IN", field: "h",  textClass: "hi-t", voiceSelectId: "meaningVoice", icon: "🇮🇳" },
  te: { label: "తెలుగు",   langCode: "te-IN", field: "te", textClass: "te-t", voiceSelectId: "meaningVoice", icon: "🇮🇳" },
};

/* ─── State ──────────────────────────────────────────────────── */
let pool = [];
let shuffled = false;
let selectedLang = "en";       // current meaning language
let currentSpeakingBtn = null;
let allVoices = [];
let jpVoices = [];
let meaningVoices = [];        // voices for the currently selected language
let autoplayActive = false;
let autoplayIndex = 0;
let selectedCardIndex = 0;

/* ─── Data helpers ───────────────────────────────────────────── */
function allItems() {
  let items = [];
  const lv = $("lv").value;
  if (lv === "n5") items = items.concat(DATA.n5 || []);
  else if (lv === "n4") items = items.concat(DATA.n4 || []);
  else if (lv === "n3") items = items.concat(DATA.n3 || []);
  else if (lv === "n2") items = items.concat(DATA.n2 || []);
  else if (lv === "n1") items = items.concat(DATA.n1 || []);
  else if (lv === "n5+n4") items = items.concat(DATA.n5 || [], DATA.n4 || []);
  else if (lv === "n5+n4+n3") items = items.concat(DATA.n5 || [], DATA.n4 || [], DATA.n3 || []);
  else if (lv === "n5+n4+n3+n2") items = items.concat(DATA.n5 || [], DATA.n4 || [], DATA.n3 || [], DATA.n2 || []);
  else if (lv === "n5+n4+n3+n2+n1") items = items.concat(DATA.n5 || [], DATA.n4 || [], DATA.n3 || [], DATA.n2 || [], DATA.n1 || []);
  return items;
}

function normalizeCat(c) {
  const catMap = {
    "Clothes":"Nouns — Clothes",
    "Animals & nature":"Nouns — Animals & Nature","Nouns — Animals":"Nouns — Animals & Nature",
    "Body & health":"Nouns — Body & Health","Nouns — Body":"Nouns — Body & Health","Nouns — Health":"Nouns — Body & Health","Nouns — Senses":"Nouns — Body & Health",
    "Food & drink":"Nouns — Food & Drink","Nouns — Food":"Nouns — Food & Drink",
    "People, family & jobs":"Nouns — People, Family & Jobs","Nouns — People":"Nouns — People, Family & Jobs",
    "Places, buildings & position":"Nouns — Places & Position","Nouns — Places":"Nouns — Places & Position","Nouns — Position":"Nouns — Places & Position","Nouns — Directions":"Nouns — Places & Position",
    "Transport & travel":"Nouns — Transport & Travel","Nouns — Transport":"Nouns — Transport & Travel","Nouns — Travel":"Nouns — Transport & Travel",
    "Time, days & calendar":"Nouns — Time & Calendar","Nouns — Time":"Nouns — Time & Calendar",
    "School, study & work":"Nouns — School & Work","Nouns — School":"Nouns — School & Work","Nouns — Work":"Nouns — School & Work",
    "Sports & hobbies":"Nouns — Sports & Hobbies","Nouns — Sports":"Nouns — Sports & Hobbies","Nouns — Hobbies":"Nouns — Sports & Hobbies",
    "Things & household objects":"Nouns — Things & Objects","Nouns — Things":"Nouns — Things & Objects","Nouns — Shopping":"Nouns — Things & Objects","Nouns — Shapes":"Nouns — Things & Objects","Nouns — Materials":"Nouns — Things & Objects",
    "Conjunctions & linking words":"Conjunctions",
    "Numbers & counters":"Counters & Numbers","Counters":"Counters & Numbers","Nouns — Numbers":"Counters & Numbers","Nouns — Measures":"Counters & Numbers","Nouns — Quantity":"Counters & Numbers",
    "Greetings & set expressions":"Expressions & Greetings","Expressions":"Expressions & Greetings",
    "Particles & conjunctions":"Particles","Particles & grammar patterns":"Particles","Nouns — Language":"Particles",
    "Adjectives & description":"Adjectives — Description","Adjectives — other":"Adjectives — General","Adjectives (seen in N5 passages)":"Adjectives — General","Nouns — Colors":"Adjectives — Colors",
    "Verbs — everyday actions":"Verbs — Action","Verbs — other":"Verbs — General","Verbs (frequent in N5 reading & listening)":"Verbs — Action",
    "Everyday & abstract nouns":"Nouns — General","Other words":"General","Common":"General",
    "Keigo — Kenjougo":"Keigo","Keigo — Polite":"Keigo","Keigo — Sonkeigo":"Keigo",
    "Common Phrases":"Common Phrases",
  };
  c = c.replace(/^N[2-5]\s*/, "").replace(/\s+in\s+N[2-5]$/, "").replace(/^—\s*/, "");
  return catMap[c] || c;
}

const ALL_CATS = [
  "Adjectives — Colors","Adjectives — Description","Adjectives — Evaluation",
  "Adjectives — Feelings","Adjectives — General","Adjectives — Weather",
  "Adverbs","Common Phrases","Conjunctions","Counters & Numbers",
  "Expressions & Greetings","General","Grammar",
  "Grammar — Addition","Grammar — Change","Grammar — Comparison",
  "Grammar — Concession","Grammar — Conditional","Grammar — Conjecture",
  "Grammar — Connection","Grammar — Contrast","Grammar — Emphasis",
  "Grammar — Frequency","Grammar — Hearsay","Grammar — Limitation",
  "Grammar — Obligation","Grammar — Possibility","Grammar — Preference",
  "Grammar — Purpose","Grammar — Reason","Grammar — Role","Grammar — Simultaneous",
  "Grammar — Time","Grammar — Timing","Grammar — Uncertainty","Grammar — Voice",
  "Keigo",
  "Nouns — Abstract","Nouns — Animals & Nature","Nouns — Arts",
  "Nouns — Body & Health","Nouns — Clothes","Nouns — Communication",
  "Nouns — Culture","Nouns — Daily life","Nouns — Economy","Nouns — Emotion",
  "Nouns — Entertainment","Nouns — Food & Drink","Nouns — General",
  "Nouns — Mental","Nouns — Money","Nouns — People, Family & Jobs",
  "Nouns — Places & Position","Nouns — School & Work","Nouns — Science",
  "Nouns — Services","Nouns — Society","Nouns — Sports & Hobbies",
  "Nouns — Technology","Nouns — Things & Objects","Nouns — Time & Calendar",
  "Nouns — Transport & Travel",
  "Particles",
  "Verbs — Abstract","Verbs — Action","Verbs — Communication","Verbs — Creative",
  "Verbs — Culture","Verbs — Daily life","Verbs — Description","Verbs — Emotion",
  "Verbs — Formal","Verbs — General","Verbs — Mental","Verbs — Money",
  "Verbs — Motion","Verbs — Nature","Verbs — Senses","Verbs — Social",
  "Verbs — State","Verbs — Time","Verbs — Transport","Verbs — Work"
];

function fillCats() {
  const items = allItems();
  const catSet = new Set();
  items.forEach(w => {
    let c = normalizeCat(w.c || "");
    if (c) catSet.add(c);
  });
  const cats = [...catSet].sort();
  const sel = $("cat");
  const cur = sel.value;
  sel.innerHTML = '<option value="">All categories</option>' +
    cats.map(c => '<option>' + c + '</option>').join("");
  if (cats.includes(cur)) sel.value = cur;
}

/* ─── Language helpers ───────────────────────────────────────── */
function getLangConfig() {
  return LANGUAGES[selectedLang] || LANGUAGES.en;
}

function getMeaningText(w) {
  const cfg = getLangConfig();
  const val = w[cfg.field];
  // Fall back to English if the chosen language field is empty
  return val || w.m || "";
}

function getMeaningTextClass() {
  return getLangConfig().textClass;
}

function getLangLabel() {
  return getLangConfig().label;
}

/* ─── Filter / Render ────────────────────────────────────────── */
function filter() {
  const q = $("q").value.toLowerCase().trim();
  const cat = $("cat").value;
  let items = allItems();
  if (cat) items = items.filter(w => normalizeCat(w.c || "") === cat);
  if (q) items = items.filter(w =>
    (w.w || "").toLowerCase().includes(q) ||
    (w.r || "").toLowerCase().includes(q) ||
    (w.ro || "").toLowerCase().includes(q) ||
    (w.m || "").toLowerCase().includes(q) ||
    (w.h || "").toLowerCase().includes(q) ||
    (w.te || "").toLowerCase().includes(q)
  );
  pool = shuffled ? shuffle(items) : items;
  render();
}

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SPEAKER_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9V15H7L12 20V4L7 9H3Z" fill="white"/><path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="white"/><path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.84 14 18.7V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="white"/></svg>';
const SPEAKER_SVG_SM = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9V15H7L12 20V4L7 9H3Z" fill="white"/><path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="white"/><path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.84 14 18.7V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="white"/></svg>';

function render() {
  const langLabel = " (" + getLangLabel() + " mode)";
  $("status").textContent = "Showing " + pool.length + " card" + (pool.length === 1 ? "" : "s") + langLabel;
  if (!pool.length) { list.innerHTML = '<div class="empty">No matches found.</div>'; return; }
  const textClass = getMeaningTextClass();
  list.innerHTML = pool.map((w, idx) => {
    const posText = (w.p || "").toUpperCase();
    const meaningText = getMeaningText(w);
    const activeClass = idx === selectedCardIndex ? " active" : "";
    return '<div class="card' + activeClass + '" id="c' + w.n + '" data-idx="' + idx + '" onclick="selectCard(' + idx + ')">' +
      '<div class="pos">' + posText + '</div>' +
      '<div class="jp-row">' +
        '<button class="jp-btn" onclick="event.stopPropagation();speakJP(' + w.n + ')" title="Play Japanese">' + SPEAKER_SVG + '</button>' +
        '<span class="jp-t">' + w.w + '</span>' +
      '</div>' +
      '<div class="ro-row">' +
        '<span class="ro-t">' + (w.ro || "") + '</span>' +
      '</div>' +
      '<div class="en-row">' +
        '<button class="en-btn" onclick="event.stopPropagation();speakMeaning(' + w.n + ')" title="Play meaning">' + SPEAKER_SVG_SM + '</button>' +
        '<span class="' + textClass + '">' + meaningText + '</span>' +
      '</div>' +
      '<span class="lv-tag ' + ((w.lv || "").toLowerCase()) + '">' + (w.lv || "") + '</span>' +
    '</div>';
  }).join("");
}

function selectCard(idx) {
  selectedCardIndex = idx;
  document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
  const card = document.querySelector('[data-idx="' + idx + '"]');
  if (card) card.classList.add('active');
}

/* ─── Voice System ───────────────────────────────────────────── */
function getBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes("Edg")) return "edge";
  if (ua.includes("Chrome")) return "chrome";
  if (ua.includes("Firefox")) return "firefox";
  if (ua.includes("Safari")) return "safari";
  return "other";
}

function findNatural(voices) {
  const browser = getBrowser();
  if (browser === "edge") {
    const edgeVoice = voices.find(v => v.name.includes("Microsoft") && v.name.includes("Online"));
    if (edgeVoice) return voices.indexOf(edgeVoice);
  } else if (browser === "chrome") {
    const googleVoice = voices.find(v => v.name.includes("Google"));
    if (googleVoice) return voices.indexOf(googleVoice);
  }
  const natural = voices.find(v => v.name.includes("Natural") || v.name.includes("Online"));
  if (natural) return voices.indexOf(natural);
  const enhanced = voices.find(v => v.name.includes("Enhanced") || v.name.includes("Premium"));
  if (enhanced) return voices.indexOf(enhanced);
  return voices.length > 0 ? 0 : -1;
}

function loadVoices() {
  allVoices = speechSynthesis.getVoices();
  jpVoices = allVoices.filter(v => v.lang.startsWith("ja"));

  // Japanese voice selector
  const jpSel = $("jpVoice");
  jpSel.innerHTML = '<option value="">JP Voice (auto)</option>' +
    jpVoices.map((v, i) => '<option value="' + i + '">' + v.name + '</option>').join("");
  const jpDefault = findNatural(jpVoices);
  if (jpDefault >= 0) jpSel.selectedIndex = jpDefault + 1;

  // Update meaning voice list for current language
  updateMeaningVoices();
}

function updateMeaningVoices() {
  const cfg = getLangConfig();
  const langPrefix = cfg.langCode.split("-")[0];
  meaningVoices = allVoices.filter(v => v.lang.startsWith(langPrefix));

  const sel = $("meaningVoice");
  sel.innerHTML = '<option value="">' + cfg.label + ' Voice (auto)</option>' +
    meaningVoices.map((v, i) => '<option value="' + i + '">' + v.name + '</option>').join("");
  const defIdx = findNatural(meaningVoices);
  if (defIdx >= 0) sel.selectedIndex = defIdx + 1;
}

if (typeof speechSynthesis !== "undefined") {
  if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = loadVoices;
  setTimeout(loadVoices, 50);
  setTimeout(loadVoices, 300);
  setTimeout(loadVoices, 1000);
}

/* ─── Speech ─────────────────────────────────────────────────── */
function stripTilde(text) {
  return (text || "").replace(/[〜~]/g, "").replace(/\*\*\//g, "").trim();
}

function speakJP(n) {
  const item = pool.find(w => w.n === n);
  if (!item) return;
  const card = $("c" + n);
  const btn = card ? card.querySelector('.jp-btn') : null;
  const fsBtn = document.querySelector('#fsCard .jp-btn');
  if (card) card.classList.add("speaking");
  if (btn) btn.classList.add("speaking");
  if (fsBtn) fsBtn.classList.add("speaking");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(stripTilde(item.r));
  u.lang = "ja-JP";
  const jpIdx = parseInt($("jpVoice").value);
  if (!isNaN(jpIdx) && jpVoices[jpIdx]) u.voice = jpVoices[jpIdx];
  else if (jpVoices.length > 0) u.voice = jpVoices[0];
  u.rate = 0.9;
  u.onend = () => {
    if (card) card.classList.remove("speaking");
    if (btn) btn.classList.remove("speaking");
    if (fsBtn) fsBtn.classList.remove("speaking");
  };
  u.onerror = u.onend;
  speechSynthesis.speak(u);
}

function speakMeaning(n) {
  const item = pool.find(w => w.n === n);
  if (!item) return;
  const card = $("c" + n);
  const btn = card ? card.querySelector('.en-btn') : null;
  const fsBtn = document.querySelector('#fsCard .en-btn');
  if (card) card.classList.add("speaking");
  if (btn) btn.classList.add("speaking");
  if (fsBtn) fsBtn.classList.add("speaking");
  speechSynthesis.cancel();
  const cfg = getLangConfig();
  const u = new SpeechSynthesisUtterance();
  u.text = stripTilde(getMeaningText(item));
  u.lang = cfg.langCode;
  const vIdx = parseInt($("meaningVoice").value);
  if (!isNaN(vIdx) && meaningVoices[vIdx]) u.voice = meaningVoices[vIdx];
  else if (meaningVoices.length > 0) u.voice = meaningVoices[0];
  u.rate = 0.9;
  u.onend = () => {
    if (card) card.classList.remove("speaking");
    if (btn) btn.classList.remove("speaking");
    if (fsBtn) fsBtn.classList.remove("speaking");
  };
  u.onerror = u.onend;
  speechSynthesis.speak(u);
}

/* ─── Settings Dialog ────────────────────────────────────────── */
function toggleSettingsDialog() {
  const dialog = $("settingsDialog");
  const btn = $("settingsBtn");
  dialog.classList.toggle("on");
  btn.classList.toggle("on");
}

/* ─── Fullscreen ─────────────────────────────────────────────── */
function toggleFullscreen() {
  const overlay = $("fsOverlay");
  overlay.classList.add("on");
  renderFSCard();
  document.addEventListener("keydown", fsKeyHandler);
}

function closeFullscreen() {
  $("fsOverlay").classList.remove("on");
  document.removeEventListener("keydown", fsKeyHandler);
}

function fsKeyHandler(e) {
  if (e.key === "Escape") closeFullscreen();
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") fsPrev();
  else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); fsNext(); }
}

function renderFSCard(direction) {
  if (!pool.length) return;
  const idx = autoplayActive ? autoplayIndex : selectedCardIndex;
  const w = pool[idx];
  const posText = (w.p || "").toUpperCase();
  const meaningText = getMeaningText(w);
  const textClass = getMeaningTextClass();
  const svgIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 9V15H7L12 20V4L7 9H3Z" fill="white"/><path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="white"/><path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.84 14 18.7V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="white"/></svg>';

  const newContent =
    '<div class="pos">' + posText + '</div>' +
    '<div class="jp-row">' +
      '<button class="jp-btn" onclick="speakJP(' + w.n + ')" title="Play Japanese">' + svgIcon + '</button>' +
      '<span class="jp-t">' + w.w + '</span>' +
    '</div>' +
    '<div class="ro-row"><span class="ro-t">' + (w.ro || "") + '</span></div>' +
    '<div class="en-row">' +
      '<button class="en-btn" onclick="speakMeaning(' + w.n + ')" title="Play meaning">' + svgIcon + '</button>' +
      '<span class="' + textClass + '">' + meaningText + '</span>' +
    '</div>' +
    '<span class="lv-tag ' + ((w.lv || "").toLowerCase()) + '">' + (w.lv || "") + '</span>';

  const fsCard = $("fsCard");

  if (direction) {
    const outClass = direction === 'next' ? 'fs-slide-out-left' : 'fs-slide-out-right';
    const inClass = direction === 'next' ? 'fs-slide-in-right' : 'fs-slide-in-left';
    fsCard.classList.remove('fs-slide-out-left', 'fs-slide-out-right', 'fs-slide-in-left', 'fs-slide-in-right', 'fs-fade-in');
    fsCard.classList.add(outClass);
    setTimeout(() => {
      fsCard.innerHTML = newContent;
      fsCard.classList.remove(outClass);
      fsCard.classList.add(inClass);
      if (autoplayActive && currentSpeakingBtn) {
        const btn = fsCard.querySelector('.' + currentSpeakingBtn);
        if (btn) btn.classList.add('speaking');
      }
      setTimeout(() => fsCard.classList.remove(inClass), 350);
    }, 280);
  } else {
    fsCard.innerHTML = newContent;
    fsCard.classList.remove('fs-slide-out-left', 'fs-slide-out-right', 'fs-slide-in-left', 'fs-slide-in-right', 'fs-fade-in');
    void fsCard.offsetWidth;
    fsCard.classList.add('fs-fade-in');
    setTimeout(() => fsCard.classList.remove('fs-fade-in'), 350);
  }

  $("fsCounter").textContent = (idx + 1) + " / " + pool.length;
}

function fsNext() {
  const idx = autoplayActive ? autoplayIndex : selectedCardIndex;
  if (idx < pool.length - 1) {
    if (autoplayActive) autoplayIndex = idx + 1;
    else selectedCardIndex = idx + 1;
    renderFSCard('next');
    const newIdx = autoplayActive ? autoplayIndex : selectedCardIndex;
    setTimeout(() => {
      speechSynthesis.cancel();
      speakJP(pool[newIdx].n);
      setTimeout(() => { speakMeaning(pool[newIdx].n); }, 1800);
    }, 350);
  }
}

function fsPrev() {
  const idx = autoplayActive ? autoplayIndex : selectedCardIndex;
  if (idx > 0) {
    if (autoplayActive) autoplayIndex = idx - 1;
    else selectedCardIndex = idx - 1;
    renderFSCard('prev');
    const newIdx = autoplayActive ? autoplayIndex : selectedCardIndex;
    setTimeout(() => {
      speechSynthesis.cancel();
      speakJP(pool[newIdx].n);
      setTimeout(() => { speakMeaning(pool[newIdx].n); }, 1800);
    }, 350);
  }
}

/* ─── Autoplay ───────────────────────────────────────────────── */
function toggleAutoplay() {
  if (autoplayActive) stopAutoplay();
  else startAutoplay();
}

function startAutoplay() {
  autoplayActive = true;
  autoplayIndex = selectedCardIndex;
  $("autoplayBtn").classList.add("on");
  $("autoplayBar").classList.add("on");
  playCurrentCard();
}

function stopAutoplay() {
  autoplayActive = false;
  speechSynthesis.cancel();
  $("autoplayBtn").classList.remove("on");
  $("autoplayBar").classList.remove("on");
}

function playCurrentCard() {
  if (!autoplayActive || autoplayIndex >= pool.length) {
    stopAutoplay();
    return;
  }
  selectCard(autoplayIndex);
  const card = document.querySelector('[data-idx="' + autoplayIndex + '"]');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });

  $("autoplayStatus").textContent = (autoplayIndex + 1) + " / " + pool.length;
  $("progressFill").style.width = ((autoplayIndex + 1) / pool.length * 100) + "%";

  const item = pool[autoplayIndex];
  speechSynthesis.cancel();

  if ($("fsOverlay").classList.contains("on")) {
    renderFSCard('next');
  }

  setTimeout(() => {
    const getButtons = () => {
      const cardEl = $("c" + item.n);
      const jpBtn = cardEl ? cardEl.querySelector('.jp-btn') : null;
      const enBtn = cardEl ? cardEl.querySelector('.en-btn') : null;
      const fsCard = $("fsCard");
      const fsJpBtn = fsCard ? fsCard.querySelector('.jp-btn') : null;
      const fsEnBtn = fsCard ? fsCard.querySelector('.en-btn') : null;
      return { cardEl, jpBtn, enBtn, fsJpBtn, fsEnBtn };
    };

    const { cardEl, jpBtn, enBtn, fsJpBtn, fsEnBtn } = getButtons();
    if (cardEl) cardEl.classList.add("speaking");
    if (jpBtn) jpBtn.classList.add("speaking");
    if (fsJpBtn) fsJpBtn.classList.add("speaking");
    currentSpeakingBtn = 'jp-btn';

    const uJP = new SpeechSynthesisUtterance(stripTilde(item.r));
    uJP.lang = "ja-JP";
    const jpIdx = parseInt($("jpVoice").value);
    if (!isNaN(jpIdx) && jpVoices[jpIdx]) uJP.voice = jpVoices[jpIdx];
    else if (jpVoices.length > 0) uJP.voice = jpVoices[0];
    uJP.rate = 0.9;

    const cfg = getLangConfig();
    const uMeaning = new SpeechSynthesisUtterance();
    uMeaning.text = stripTilde(getMeaningText(item));
    uMeaning.lang = cfg.langCode;
    const vIdx = parseInt($("meaningVoice").value);
    if (!isNaN(vIdx) && meaningVoices[vIdx]) uMeaning.voice = meaningVoices[vIdx];
    else if (meaningVoices.length > 0) uMeaning.voice = meaningVoices[0];
    uMeaning.rate = 0.9;

    uJP.onend = () => {
      const btns = getButtons();
      if (btns.jpBtn) btns.jpBtn.classList.remove("speaking");
      if (btns.fsJpBtn) btns.fsJpBtn.classList.remove("speaking");
      if (btns.enBtn) btns.enBtn.classList.add("speaking");
      if (btns.fsEnBtn) btns.fsEnBtn.classList.add("speaking");
      currentSpeakingBtn = 'en-btn';
      if (!autoplayActive) return;
      setTimeout(() => {
        if (!autoplayActive) return;
        speechSynthesis.speak(uMeaning);
      }, 400);
    };

    uMeaning.onend = () => {
      const btns = getButtons();
      if (btns.enBtn) btns.enBtn.classList.remove("speaking");
      if (btns.fsEnBtn) btns.fsEnBtn.classList.remove("speaking");
      if (btns.cardEl) btns.cardEl.classList.remove("speaking");
      currentSpeakingBtn = null;
      if (!autoplayActive) return;
      autoplayIndex++;
      setTimeout(() => {
        if (!autoplayActive) return;
        playCurrentCard();
      }, 800);
    };

    uJP.onerror = () => {
      const btns = getButtons();
      if (btns.cardEl) btns.cardEl.classList.remove("speaking");
      if (btns.jpBtn) btns.jpBtn.classList.remove("speaking");
      if (btns.enBtn) btns.enBtn.classList.remove("speaking");
      if (btns.fsJpBtn) btns.fsJpBtn.classList.remove("speaking");
      if (btns.fsEnBtn) btns.fsEnBtn.classList.remove("speaking");
    };
    uMeaning.onerror = uJP.onerror;

    speechSynthesis.speak(uJP);
  }, 100);
}

function nextCard() {
  if (autoplayIndex < pool.length - 1) {
    autoplayIndex++;
    playCurrentCard();
  }
}

function prevCard() {
  if (autoplayIndex > 0) {
    autoplayIndex--;
    playCurrentCard();
  }
}

/* ─── Event Listeners ────────────────────────────────────────── */
$("q").addEventListener("input", filter);
$("lv").addEventListener("change", () => {
  const lvSel = $("lv");
  const badge = $("levelBadge");
  if (badge) {
    const selectedText = lvSel.options[lvSel.selectedIndex].text;
    const levelMatch = selectedText.match(/N[1-5]/);
    if (levelMatch) badge.textContent = "JLPT " + levelMatch[0];
  }
  fillCats(); filter();
});
$("cat").addEventListener("change", filter);

// Shuffle toggle
$("shuf").addEventListener("click", () => {
  const status = $("shuf").querySelector(".toggle-status");
  if (status) status.textContent = shuffled ? "ON" : "OFF";
  shuffled = !shuffled;
  $("shuf").classList.toggle("on", shuffled);
  filter();
});

// Language selector
$("langSelect").addEventListener("change", () => {
  selectedLang = $("langSelect").value;
  updateMeaningVoices();
  render();
  // Re-render fullscreen card if open
  if ($("fsOverlay").classList.contains("on")) {
    renderFSCard();
  }
});

/* ─── Init ───────────────────────────────────────────────────── */
fillCats();
filter();

// Mobile layout fix
function fixMobileHeaderButtons() {
  if (window.innerWidth <= 700) {
    const headerBtns = document.querySelector('.header-btns');
    const settingsBar = document.getElementById('settingsBar');
    if (headerBtns && settingsBar && settingsBar.style.display !== 'none') {
      headerBtns.style.position = 'relative';
      headerBtns.style.top = 'auto';
      headerBtns.style.right = 'auto';
      headerBtns.style.marginBottom = '10px';
    }
  }
}
window.addEventListener('resize', fixMobileHeaderButtons);
window.addEventListener('load', fixMobileHeaderButtons);

/* ─── Sakura Petals ──────────────────────────────────────────── */
function createSakuraPetal() {
  const petal = document.createElement('div');
  petal.className = 'sakura-petal';
  petal.textContent = '🌸';
  petal.style.left = Math.random() * 100 + 'vw';
  petal.style.animation = `sakuraFall ${5 + Math.random() * 3}s linear ${Math.random() * 2}s`;
  document.body.appendChild(petal);
  setTimeout(() => { if (petal.parentNode) petal.remove(); }, 8000);
}
setInterval(createSakuraPetal, 3000);
for (let i = 0; i < 3; i++) setTimeout(createSakuraPetal, i * 500);

/* ─── Dialog close handlers ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  const settingsDialog = document.getElementById('settingsDialog');
  if (settingsDialog) {
    settingsDialog.addEventListener('click', function (e) {
      if (e.target === settingsDialog) toggleSettingsDialog();
    });
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const settingsDialog = document.getElementById('settingsDialog');
    if (settingsDialog && settingsDialog.classList.contains('on')) {
      toggleSettingsDialog();
    }
  }
});
