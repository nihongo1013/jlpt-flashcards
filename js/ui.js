/* Rendering, fullscreen, autoplay, and deck-mode UI */

function setStatus(message) {
  const status = $("status");
  if (status) status.textContent = message;
}

function toggleHidden(id, hidden) {
  const element = $(id);
  if (element) element.classList.toggle("hidden", hidden);
}

function setChecked(id, checked) {
  const element = $(id);
  if (element) element.checked = !!checked;
}

function setSelectValue(id, value) {
  const element = $(id);
  if (element && value) element.value = value;
}

function updatePlaybackChrome() {
  const bar = document.querySelector(".pair-bar");
  if (bar) {
    const fullscreen = $("fsOverlay").classList.contains("on");
    bar.classList.toggle("hidden", autoplayActive || fullscreen);
  }
}

function setModeVisibility() {
  const isDictionary = deckMode === "dictionary";
  toggleHidden("pairFields", !isDictionary);
  toggleHidden("jlptLangField", isDictionary);
  toggleHidden("levelSection", isDictionary);
  setSelectValue("deckMode", deckMode);
  setSelectValue("sourceLang", sourceLang);
  setSelectValue("targetLang", targetLang);
  setSelectValue("langSelect", selectedLang);
  setChecked("showContext", showSenseContext);

  ["sourceLang", "targetLang"].forEach(id => {
    const element = $(id);
    if (element) element.disabled = !isDictionary;
  });
  const legacySelect = $("langSelect");
  if (legacySelect) legacySelect.disabled = isDictionary;
  const levelSelect = $("lv");
  if (levelSelect) levelSelect.disabled = isDictionary;

  const categoryLabel = $("catLabel");
  if (categoryLabel) categoryLabel.textContent = "Category";
  updatePlaybackChrome();
}

function updateStatus() {
  const total = pool.length;
  const shown = Math.min(visibleLimit, total);
  const front = currentSideConfig("front");
  const back = currentSideConfig("back");
  if (!total) {
    setStatus("No cards match these filters, " + front.label + " → " + back.label);
    return;
  }
  setStatus(
    formatCount(total) + " card" + (total === 1 ? "" : "s") +
    ", " + front.label + " → " + back.label +
    ", showing " + formatCount(shown)
  );
}

function speakerButton(index, side, cssClass, label) {
  return '<button type="button" class="' + cssClass + ' speak-btn" ' +
    'data-index="' + index + '" data-side="' + side + '" ' +
    'aria-label="' + escapeHtml(label) + '" title="' + escapeHtml(label) + '">' +
    SPEAKER_SVG + '</button>';
}

function sideBlock(card, index, side) {
  const data = card[side];
  const isFront = side === "front";
  const buttonClass = isFront ? "jp-btn" : "en-btn";
  const textClass = isFront ? "jp-t" : "en-t";
  const label = data.label || data.name || "";
  const terms = data.alternates.slice(0, 3).map(escapeHtml).join(", ");
  const dir = data.dir || "ltr";
  const lang = data.locale || data.code || "";
  const rtlClass = data.rtl ? " rtl-text" : "";
  return '<section class="side-block ' + side + '-block">' +
      '<div class="side-head">' +
        '<span class="side-label">' + escapeHtml(label) +
          (data.gender ? '<span class="gender-tag">' + escapeHtml(data.gender) + '</span>' : '') +
        '</span>' +
        speakerButton(index, side, buttonClass, "Play " + label) +
      '</div>' +
      '<div class="' + textClass + ' term-text' + rtlClass + '" lang="' + escapeHtml(lang) + '" dir="' + dir + '">' +
        escapeHtml(data.word) +
      '</div>' +
      (data.reading ? '<div class="reading" dir="ltr">' + escapeHtml(data.reading) + '</div>' : '') +
      (terms ? '<div class="alt-terms">' + terms + '</div>' : '') +
    '</section>';
}

function renderCardContent(card, index, fullscreen) {
  const context = showSenseContext && (card.contextTitle || card.contextText)
    ? '<div class="sense-context"><strong>' + escapeHtml(card.contextTitle || "") + '</strong>' +
        (card.contextText ? '<span class="context-sep">, </span>' + escapeHtml(card.contextText) : '') +
      '</div>'
    : "";
  const rootClass = "card" + (index === selectedCardIndex ? " active" : "");
  const rootId = fullscreen ? "fs-card-item" : "card-" + index;
  const ordinal = String(index + 1).padStart(2, "0");
  return '<article class="' + rootClass + '" id="' + rootId + '" ' +
      'data-card-index="' + index + '" data-index="' + index + '">' +
      '<div class="card-meta">' +
        '<span class="card-index">' + ordinal + '</span>' +
        '<span class="card-pair">' + escapeHtml(card.pairLabel || "") + '</span>' +
        '<span class="card-pos">' + escapeHtml(card.pos || card.mode || "") + '</span>' +
      '</div>' +
      sideBlock(card, index, "front") +
      '<div class="card-divider" aria-hidden="true"></div>' +
      sideBlock(card, index, "back") +
      context +
      '<footer class="card-footer">' +
        '<span class="lv-tag ' + escapeHtml(card.badgeClass || "") + '">' + escapeHtml(card.badge || "") + '</span>' +
      '</footer>' +
    '</article>';
}

function render() {
  const list = $("list");
  if (!list) return;
  updateStatus();
  if (!pool.length) {
    const reason = deckMode === "dictionary"
      ? "No cards match this pair and filter. Try another pair or clear the search."
      : "No matches found. Try another level, category, or search.";
    list.innerHTML = '<div class="empty">' + escapeHtml(reason) + '</div>';
    return;
  }
  const shown = Math.min(visibleLimit, pool.length);
  let html = "";
  for (let index = 0; index < shown; index++) {
    html += renderCardContent(pool[index], index, false);
  }
  if (pool.length > shown) {
    html += '<button type="button" class="show-more" data-action="show-more">' +
      'Show more cards (' + formatCount(pool.length - shown) + ' remaining)</button>';
  }
  list.innerHTML = html;
}

function showMoreCards() {
  visibleLimit = Math.min(pool.length, visibleLimit + VISIBLE_CARD_STEP);
  render();
}

function ensureVisible(index) {
  if (index < visibleLimit) return false;
  const pages = Math.ceil((index + 1) / VISIBLE_CARD_STEP);
  visibleLimit = Math.min(pool.length, pages * VISIBLE_CARD_STEP);
  render();
  return true;
}

function selectCard(index) {
  if (index < 0 || index >= pool.length) return;
  selectedCardIndex = index;
  if (ensureVisible(index)) return;
  document.querySelectorAll(".card[data-card-index]").forEach(card => {
    card.classList.toggle("active", Number(card.dataset.cardIndex) === index);
  });
}

function toggleSettingsDialog() {
  const dialog = $("settingsDialog");
  const button = $("settingsBtn");
  if (!dialog) return;
  dialog.classList.toggle("on");
  if (button) button.classList.toggle("on");
}

function toggleFullscreen() {
  $("fsOverlay").classList.add("on");
  updatePlaybackChrome();
  document.removeEventListener("keydown", fsKeyHandler);
  document.addEventListener("keydown", fsKeyHandler);
  renderFSCard();
}

function closeFullscreen() {
  $("fsOverlay").classList.remove("on");
  updatePlaybackChrome();
  document.removeEventListener("keydown", fsKeyHandler);
}

function fsKeyHandler(event) {
  if (event.key === "Escape") closeFullscreen();
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") fsPrev();
  else if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === " ") {
    event.preventDefault();
    fsNext();
  }
}

function renderFSCard(direction) {
  const container = $("fsCard");
  const counter = $("fsCounter");
  if (!pool.length) {
    if (container) container.innerHTML = '<div class="empty">No cards available.</div>';
    if (counter) counter.textContent = "0 / 0";
    return;
  }
  const index = Math.max(0, Math.min(
    pool.length - 1,
    autoplayActive ? autoplayIndex : selectedCardIndex
  ));
  const content = renderCardContent(pool[index], index, true);
  const token = ++fsRenderToken;
  if (counter) counter.textContent = (index + 1) + " / " + formatCount(pool.length);

  if (direction) {
    const outClass = direction === "next" ? "fs-slide-out-left" : "fs-slide-out-right";
    const inClass = direction === "next" ? "fs-slide-in-right" : "fs-slide-in-left";
    container.classList.remove("fs-slide-out-left", "fs-slide-out-right", "fs-slide-in-left", "fs-slide-in-right", "fs-fade-in");
    container.classList.add(outClass);
    setTimeout(() => {
      if (token !== fsRenderToken) return;
      container.innerHTML = content;
      if (currentSpeakingBtn) setSpeakingState(index, currentSpeakingBtn, true);
      container.classList.remove(outClass);
      container.classList.add(inClass);
      setTimeout(() => {
        if (token === fsRenderToken) container.classList.remove(inClass);
      }, 350);
    }, 280);
  } else {
    container.innerHTML = content;
    if (currentSpeakingBtn) setSpeakingState(index, currentSpeakingBtn, true);
    container.classList.remove("fs-slide-out-left", "fs-slide-out-right", "fs-slide-in-left", "fs-slide-in-right", "fs-fade-in");
    void container.offsetWidth;
    container.classList.add("fs-fade-in");
    setTimeout(() => {
      if (token === fsRenderToken) container.classList.remove("fs-fade-in");
    }, 350);
  }
}

function fsNext() {
  if (!pool.length) return;
  const index = autoplayActive ? autoplayIndex : selectedCardIndex;
  if (index >= pool.length - 1) return;
  if (autoplayActive) autoplayIndex = index + 1;
  else selectedCardIndex = index + 1;
  const newIndex = autoplayActive ? autoplayIndex : selectedCardIndex;
  selectCard(newIndex);
  renderFSCard("next");
  playCardPair(newIndex);
}

function fsPrev() {
  if (!pool.length) return;
  const index = autoplayActive ? autoplayIndex : selectedCardIndex;
  if (index <= 0) return;
  if (autoplayActive) autoplayIndex = index - 1;
  else selectedCardIndex = index - 1;
  const newIndex = autoplayActive ? autoplayIndex : selectedCardIndex;
  selectCard(newIndex);
  renderFSCard("prev");
  playCardPair(newIndex);
}

function toggleAutoplay() {
  if (autoplayActive) stopAutoplay();
  else startAutoplay();
}

function startAutoplay() {
  if (!pool.length) return;
  autoplayActive = true;
  autoplayIndex = Math.min(selectedCardIndex, pool.length - 1);
  $("autoplayBtn").classList.add("on");
  $("autoplayBar").classList.add("on");
  updatePlaybackChrome();
  playCurrentCard();
}

function stopAutoplay() {
  autoplayActive = false;
  currentSpeakingBtn = null;
  if (canSpeak()) speechSynthesis.cancel();
  const button = $("autoplayBtn");
  const bar = $("autoplayBar");
  if (button) button.classList.remove("on");
  if (bar) bar.classList.remove("on");
  document.querySelectorAll(".speaking").forEach(node => node.classList.remove("speaking"));
  updatePlaybackChrome();
}

function playCurrentCard() {
  if (!autoplayActive || autoplayIndex >= pool.length) {
    stopAutoplay();
    return;
  }
  selectCard(autoplayIndex);
  const cardNode = document.querySelector('.card[data-card-index="' + autoplayIndex + '"]');
  if (cardNode) cardNode.scrollIntoView({ behavior: "smooth", block: "center" });

  $("autoplayStatus").textContent = (autoplayIndex + 1) + " / " + formatCount(pool.length);
  $("progressFill").style.width = ((autoplayIndex + 1) / pool.length * 100) + "%";
  if ($("fsOverlay").classList.contains("on")) renderFSCard("next");

  playCardPair(autoplayIndex, () => {
    if (!autoplayActive) return;
    autoplayIndex++;
    setTimeout(() => {
      if (autoplayActive) playCurrentCard();
    }, 800);
  }, () => autoplayActive);
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
