/* App bootstrap and event wiring */
const SETTINGS_KEY = "lingua-pairs-settings-v2";
const LEGACY_SETTINGS_KEY = "jlpt-flashcards-settings-v2";
const ACCENT_KEYS = ["moss", "oxide", "indigo", "plum", "teal", "umber"];
let currentAccent = document.documentElement.dataset.accent || "moss";

function applyRandomAccent() {
  const choices = ACCENT_KEYS.filter(key => key !== currentAccent);
  currentAccent = choices[Math.floor(Math.random() * choices.length)];
  document.documentElement.dataset.accent = currentAccent;
}

function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) ||
      localStorage.getItem(LEGACY_SETTINGS_KEY) || "{}";
    return JSON.parse(raw) || {};
  } catch (_) {
    return {};
  }
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      deckMode: deckMode,
      sourceLang: sourceLang,
      targetLang: targetLang,
      selectedLang: selectedLang,
      level: $("lv").value,
      shuffled: shuffled,
      showSenseContext: showSenseContext,
      accent: currentAccent,
      speechRate: speechRate,
      cardTextMax: cardTextMax,
    }));
  } catch (_) {
    /* localStorage can be unavailable when opened directly as file:// */
  }
}

function updateShuffleControl() {
  const button = $("shuf");
  if (!button) return;
  const status = button.querySelector(".toggle-status");
  if (status) status.textContent = shuffled ? "ON" : "OFF";
  button.classList.toggle("on", shuffled);
}

function applyStoredSettings() {
  const saved = readSettings();
  if (saved.deckMode === "dictionary" || saved.deckMode === "jlpt") deckMode = saved.deckMode;
  if (dictionaryLanguageMap.has(saved.sourceLang)) sourceLang = saved.sourceLang;
  if (dictionaryLanguageMap.has(saved.targetLang)) targetLang = saved.targetLang;
  if (LANGUAGES[saved.selectedLang]) selectedLang = saved.selectedLang;
  if (saved.level) $("lv").value = saved.level;
  shuffled = !!saved.shuffled;
  showSenseContext = saved.showSenseContext === true;
  const savedRate = Number(saved.speechRate);
  if (savedRate >= 0.5 && savedRate <= 2) speechRate = savedRate;
  const savedTextMax = Number(saved.cardTextMax);
  if (savedTextMax >= 24 && savedTextMax <= 96) cardTextMax = savedTextMax;
  if (ACCENT_KEYS.includes(saved.accent)) {
    currentAccent = saved.accent;
    document.documentElement.dataset.accent = currentAccent;
  }

  // Optional shareable pair URL, e.g. ?from=ja&to=fr
  try {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    const to = params.get("to");
    if (dictionaryLanguageMap.has(from)) sourceLang = from;
    if (dictionaryLanguageMap.has(to)) targetLang = to;
  } catch (_) {
    /* Ignore malformed/unsupported URL search APIs. */
  }

  if (sourceLang === targetLang) {
    const alternative = dictionaryLanguageRecords()
      .map(item => item.code)
      .find(code => code !== sourceLang);
    targetLang = alternative || (sourceLang === "en" ? "ja" : "en");
  }
  updateShuffleControl();
}

function populateLanguageControls() {
  populateLanguageSelect($("sourceLang"), sourceLang);
  populateLanguageSelect($("targetLang"), targetLang);
  setModeVisibility();
}

function chooseDifferentTarget(previousSource) {
  if (sourceLang !== targetLang) return;
  targetLang = previousSource && previousSource !== sourceLang
    ? previousSource
    : (dictionaryLanguageRecords().map(item => item.code).find(code => code !== sourceLang) || "en");
  setSelectValue("targetLang", targetLang);
}

function chooseDifferentSource(previousTarget) {
  if (sourceLang !== targetLang) return;
  sourceLang = previousTarget && previousTarget !== targetLang
    ? previousTarget
    : (dictionaryLanguageRecords().map(item => item.code).find(code => code !== targetLang) || "ja");
  setSelectValue("sourceLang", sourceLang);
}

function bindDeckEvents() {
  $("deckMode").addEventListener("change", event => {
    deckMode = event.target.value === "jlpt" ? "jlpt" : "dictionary";
    applyRandomAccent();
    persistSettings();
    refreshDeck();
  });

  $("sourceLang").addEventListener("change", event => {
    const previous = sourceLang;
    sourceLang = event.target.value || DEFAULT_SOURCE_LANG;
    chooseDifferentTarget(previous);
    applyRandomAccent();
    persistSettings();
    refreshDeck();
  });

  $("targetLang").addEventListener("change", event => {
    const previous = targetLang;
    targetLang = event.target.value || DEFAULT_TARGET_LANG;
    chooseDifferentSource(previous);
    applyRandomAccent();
    persistSettings();
    refreshDeck();
  });

  $("swapLangs").addEventListener("click", () => {
    const oldSource = sourceLang;
    sourceLang = targetLang;
    targetLang = oldSource;
    setSelectValue("sourceLang", sourceLang);
    setSelectValue("targetLang", targetLang);
    applyRandomAccent();
    persistSettings();
    refreshDeck();
  });

  $("langSelect").addEventListener("change", event => {
    selectedLang = event.target.value || DEFAULT_LANG;
    applyRandomAccent();
    persistSettings();
    refreshDeck();
  });

  $("lv").addEventListener("change", () => {
    fillCats();
    filter();
    persistSettings();
  });
  $("cat").addEventListener("change", filter);
  $("q").addEventListener("input", filter);

  $("shuf").addEventListener("click", () => {
    shuffled = !shuffled;
    updateShuffleControl();
    filter();
    persistSettings();
  });

  $("showContext").addEventListener("change", event => {
    showSenseContext = !!event.target.checked;
    render();
    if ($("fsOverlay").classList.contains("on")) renderFSCard();
    persistSettings();
  });

  $("speedSlider").addEventListener("input", event => {
    speechRate = Math.min(2, Math.max(0.5, Number(event.target.value) || 1));
    updateSettingsControls();
    persistSettings();
  });

  $("textSizeSlider").addEventListener("input", event => {
    cardTextMax = Math.min(96, Math.max(24, Number(event.target.value) || 96));
    updateSettingsControls();
    fitCardsToViewport();
    if ($("fsOverlay").classList.contains("on")) fitFullscreenCard();
    persistSettings();
  });
}

function bindCardEvents() {
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const speaker = target.closest(".speak-btn");
    if (speaker) {
      event.preventDefault();
      event.stopPropagation();
      speakCardSide(Number(speaker.dataset.index), speaker.dataset.side);
      return;
    }

    const more = target.closest('[data-action="show-more"]');
    if (more) {
      event.preventDefault();
      showMoreCards();
      return;
    }

    if (target.closest("a, button, input, select, label")) return;
    const card = target.closest(".card[data-card-index]");
    if (card) selectCard(Number(card.dataset.cardIndex));
  });
}

function bindDialogHandlers() {
  const dialog = $("settingsDialog");
  if (dialog) {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) toggleSettingsDialog();
    });
  }
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if ($("fsOverlay").classList.contains("on")) closeFullscreen();
    else if (dialog && dialog.classList.contains("on")) toggleSettingsDialog();
  });
}

function init() {
  applyStoredSettings();
  populateLanguageControls();
  bindDeckEvents();
  bindCardEvents();
  bindDialogHandlers();
  initVoices();
  window.addEventListener("resize", () => {
    fitCardsToViewport();
    if ($("fsOverlay").classList.contains("on")) fitFullscreenCard();
  });
  refreshDeck().catch(error => {
    console.error(error);
  });
}

init();
