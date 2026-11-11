/* Rendering, fullscreen, autoplay, and deck-mode UI */

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

function activePlaybackIndex() {
  return autoplayActive ? autoplayIndex : selectedCardIndex;
}

function setPlaybackIndex(index) {
  if (autoplayActive) autoplayIndex = index;
  else selectedCardIndex = index;
}

function updatePlayer() {
  const total = pool.length;
  const index = total ? Math.max(0, Math.min(total - 1, activePlaybackIndex())) : 0;
  const label = total ? (index + 1) + " / " + formatCount(total) : "0 / 0";
  const status = $("autoplayStatus");
  if (status) status.textContent = label;
  const counter = $("fsCounter");
  if (counter) counter.textContent = label;
  const fill = $("progressFill");
  if (fill) fill.style.width = total ? ((index + 1) / total * 100).toFixed(2) + "%" : "0%";
  const progress = document.querySelector(".progress");
  if (progress) {
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", String(total));
    progress.setAttribute("aria-valuenow", String(index + 1));
  }
}

function updateSettingsControls() {
  const speed = $("speedSlider");
  if (speed) {
    speed.value = String(speechRate);
    const output = $("speedValue");
    if (output) output.textContent = Number(speechRate).toFixed(1) + "x";
  }
  const size = $("textSizeSlider");
  if (size) {
    size.value = String(cardTextMax);
    const output = $("textSizeValue");
    if (output) output.textContent = Math.round(cardTextMax) + " px";
  }
}

function updatePlaybackChrome() {
  const fullscreen = $("fsOverlay").classList.contains("on");
  const bar = document.querySelector(".pair-bar");
  if (bar) bar.classList.toggle("hidden", autoplayActive || fullscreen);
  const player = $("autoplayBar");
  if (player) {
    player.classList.toggle("fs-hidden", fullscreen);
    player.classList.toggle("on", autoplayActive);
  }
  const headerButton = $("autoplayBtn");
  if (headerButton) headerButton.classList.toggle("on", autoplayActive);
  updatePlayer();
  fitCardsToViewport();
  if (fullscreen) fitFullscreenCard();
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
  updateSettingsControls();
  updatePlaybackChrome();
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
  const dir = data.dir || "ltr";
  const lang = data.locale || data.code || "";
  const rtlClass = data.rtl ? " rtl-text" : "";
  return '<section class="side-block ' + side + '-block">' +
      '<div class="side-line">' +
        speakerButton(index, side, buttonClass, "Play " + label) +
        '<div class="side-copy">' +
          '<div class="' + textClass + ' term-text' + rtlClass + '" lang="' + escapeHtml(lang) + '" dir="' + dir + '">' +
            escapeHtml(data.word) +
          '</div>' +
          (data.reading ? '<div class="reading" dir="ltr">' + escapeHtml(data.reading) + '</div>' : '') +
        '</div>' +
      '</div>' +
    '</section>';
}

function fitTermText(element, maxFont) {
  const copy = element.closest(".side-copy");
  if (!copy) return;
  const width = copy.clientWidth;
  const height = copy.clientHeight;
  if (!width || !height) return;
  const reading = copy.querySelector(".reading");
  const readingHeight = reading ? reading.offsetHeight : 0;
  const availableHeight = Math.max(24, height - readingHeight - 4);
  element.style.overflow = "hidden";
  element.style.maxHeight = availableHeight + "px";
  let low = 14;
  let high = Math.max(14, Math.min(160, maxFont));
  let best = low;
  for (let step = 0; step < 9; step++) {
    const middle = (low + high) / 2;
    element.style.fontSize = middle.toFixed(1) + "px";
    const fits = element.scrollWidth <= width + 1 && element.scrollHeight <= availableHeight + 1;
    if (fits) {
      best = middle;
      low = middle;
    } else {
      high = middle;
    }
  }
  element.style.fontSize = best.toFixed(1) + "px";
  element.style.maxHeight = "";
  element.style.overflow = "";
  if (reading) {
    reading.style.fontSize = Math.max(12, Math.min(20, best * 0.32)).toFixed(1) + "px";
  }
}

function fitCardText(root) {
  if (!root) return;
  const fullscreen = !!root.closest(".fullscreen-overlay");
  const maxFont = Math.round(cardTextMax * (fullscreen ? 1.5 : 1));
  root.querySelectorAll(".term-text").forEach(element => fitTermText(element, maxFont));
}

function fitCardsToViewport() {
  const list = $("list");
  if (!list) return;
  const player = $("autoplayBar");
  const fullscreen = $("fsOverlay").classList.contains("on");
  const playerHidden = !player || player.classList.contains("fs-hidden") || fullscreen;
  const playerHeight = playerHidden ? 0 : player.getBoundingClientRect().height;
  const top = list.getBoundingClientRect().top;
  const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
  const available = Math.max(0, window.innerHeight - top - playerHeight - gap);
  const height = Math.max(96, available / 2);
  list.style.setProperty("--card-height", height.toFixed(1) + "px");
  fitCardText(list);
}

function fitFullscreenCard() {
  const overlay = $("fsOverlay");
  const stage = $("fsCard");
  if (!stage) return;
  const nav = overlay ? overlay.querySelector(".fs-nav") : null;
  const navHeight = nav ? nav.getBoundingClientRect().height : 0;
  const navMargin = nav ? (parseFloat(getComputedStyle(nav).marginTop) || 0) : 0;
  const overlayStyle = overlay ? getComputedStyle(overlay) : null;
  const overlayPadding = overlayStyle
    ? (parseFloat(overlayStyle.paddingTop) || 0) + (parseFloat(overlayStyle.paddingBottom) || 0)
    : 0;
  const available = Math.max(240, window.innerHeight - overlayPadding - navHeight - navMargin);
  stage.style.setProperty("--fs-stage-height", available.toFixed(1) + "px");
  fitCardText(stage);
}

function renderCardContent(card, index, fullscreen) {
  const context = showSenseContext && (card.contextTitle || card.contextText)
    ? '<div class="sense-context"><strong>' + escapeHtml(card.contextTitle || "") + '</strong>' +
        (card.contextText ? '<span class="context-sep">, </span>' + escapeHtml(card.contextText) : '') +
      '</div>'
    : "";
  const rootClass = "card" + (index === selectedCardIndex ? " active" : "");
  const rootId = fullscreen ? "fs-card-item" : "card-" + index;
  const ordinal = String(index + 1);
  return '<article class="' + rootClass + '" id="' + rootId + '" ' +
      'data-card-index="' + index + '" data-index="' + index + '">' +
      '<div class="card-meta">' +
        '<span class="card-index">' + ordinal + '</span>' +
        '<span class="card-pair">' + escapeHtml(card.pairLabel || "") + '</span>' +
      '</div>' +
      '<div class="card-sides">' +
        sideBlock(card, index, "front") +
        '<div class="card-divider" aria-hidden="true"></div>' +
        sideBlock(card, index, "back") +
      '</div>' +
      context +
      '<footer class="card-footer">' +
        '<span class="lv-tag ' + escapeHtml(card.badgeClass || "") + '">' + escapeHtml(card.badge || "") + '</span>' +
      '</footer>' +
    '</article>';
}

function render() {
  const list = $("list");
  if (!list) return;
  updatePlayer();
  if (!pool.length) {
    const reason = deckMode === "dictionary"
      ? "No cards match this pair and filter. Try another pair or clear the search."
      : "No matches found. Try another level, category, or search.";
    list.innerHTML = '<div class="empty">' + escapeHtml(reason) + '</div>';
    fitCardsToViewport();
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
  fitCardsToViewport();
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
  updatePlayer();
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
  fitFullscreenCard();
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
  if (!pool.length) {
    if (container) container.innerHTML = '<div class="empty">No cards available.</div>';
    updatePlayer();
    fitFullscreenCard();
    return;
  }
  const index = Math.max(0, Math.min(pool.length - 1, activePlaybackIndex()));
  const content = renderCardContent(pool[index], index, true);
  const token = ++fsRenderToken;
  updatePlayer();

  if (direction) {
    const outClass = direction === "next" ? "fs-slide-out-left" : "fs-slide-out-right";
    const inClass = direction === "next" ? "fs-slide-in-right" : "fs-slide-in-left";
    container.classList.remove("fs-slide-out-left", "fs-slide-out-right", "fs-slide-in-left", "fs-slide-in-right", "fs-fade-in");
    container.classList.add(outClass);
    setTimeout(() => {
      if (token !== fsRenderToken) return;
      container.innerHTML = content;
      if (currentSpeakingBtn) setSpeakingState(index, currentSpeakingBtn, true);
      fitFullscreenCard();
      container.classList.remove(outClass);
      container.classList.add(inClass);
      setTimeout(() => {
        if (token === fsRenderToken) container.classList.remove(inClass);
      }, 350);
    }, 280);
  } else {
    container.innerHTML = content;
    if (currentSpeakingBtn) setSpeakingState(index, currentSpeakingBtn, true);
    fitFullscreenCard();
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
  const index = activePlaybackIndex();
  if (index >= pool.length - 1) return;
  setPlaybackIndex(index + 1);
  selectCard(index + 1);
  updatePlayer();
  renderFSCard("next");
  playCardPair(index + 1);
}

function fsPrev() {
  if (!pool.length) return;
  const index = activePlaybackIndex();
  if (index <= 0) return;
  setPlaybackIndex(index - 1);
  selectCard(index - 1);
  updatePlayer();
  renderFSCard("prev");
  playCardPair(index - 1);
}

function toggleAutoplay() {
  if (autoplayActive) stopAutoplay();
  else startAutoplay();
}

function startAutoplay() {
  if (!pool.length) return;
  autoplayActive = true;
  autoplayIndex = Math.min(selectedCardIndex, pool.length - 1);
  updatePlaybackChrome();
  playCurrentCard();
}

function stopAutoplay() {
  autoplayActive = false;
  currentSpeakingBtn = null;
  if (canSpeak()) speechSynthesis.cancel();
  document.querySelectorAll(".speaking").forEach(node => node.classList.remove("speaking"));
  updatePlaybackChrome();
}

function playCurrentCard(direction) {
  const index = activePlaybackIndex();
  if (!pool.length || index < 0 || index >= pool.length) {
    if (autoplayActive) stopAutoplay();
    return;
  }
  selectCard(index);
  updatePlayer();
  const cardNode = document.querySelector('.card[data-card-index="' + index + '"]');
  if (cardNode) cardNode.scrollIntoView({ behavior: "smooth", block: "center" });

  if ($("fsOverlay").classList.contains("on")) renderFSCard(direction);

  playCardPair(index, () => {
    if (!autoplayActive) return;
    if (autoplayIndex >= pool.length - 1) {
      stopAutoplay();
      return;
    }
    autoplayIndex++;
    setTimeout(() => {
      if (autoplayActive) playCurrentCard("next");
    }, playbackGap(800));
  }, () => autoplayActive);
}

function nextCard() {
  if (!pool.length) return;
  const index = activePlaybackIndex();
  if (index >= pool.length - 1) return;
  setPlaybackIndex(index + 1);
  playCurrentCard("next");
}

function prevCard() {
  if (!pool.length) return;
  const index = activePlaybackIndex();
  if (index <= 0) return;
  setPlaybackIndex(index - 1);
  playCurrentCard("prev");
}
