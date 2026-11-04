function render() {
  const list = $("list");
  const langLabel = " (" + getLangLabel() + " mode)";
  $("status").textContent = "Showing " + pool.length + " card" + (pool.length === 1 ? "" : "s") + langLabel;
  if (!pool.length) {
    list.innerHTML = '<div class="empty">No matches found.</div>';
    return;
  }
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
  document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
  const card = document.querySelector('[data-idx="' + idx + '"]');
  if (card) card.classList.add("active");
}

function toggleSettingsDialog() {
  const dialog = $("settingsDialog");
  const btn = $("settingsBtn");
  dialog.classList.toggle("on");
  btn.classList.toggle("on");
}

function toggleFullscreen() {
  $("fsOverlay").classList.add("on");
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
  else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
    e.preventDefault();
    fsNext();
  }
}

function renderFSCard(direction) {
  if (!pool.length) return;
  const idx = autoplayActive ? autoplayIndex : selectedCardIndex;
  const w = pool[idx];
  const posText = (w.p || "").toUpperCase();
  const meaningText = getMeaningText(w);
  const textClass = getMeaningTextClass();

  const newContent =
    '<div class="pos">' + posText + '</div>' +
    '<div class="jp-row">' +
      '<button class="jp-btn" onclick="speakJP(' + w.n + ')" title="Play Japanese">' + SPEAKER_SVG + '</button>' +
      '<span class="jp-t">' + w.w + '</span>' +
    '</div>' +
    '<div class="ro-row"><span class="ro-t">' + (w.ro || "") + '</span></div>' +
    '<div class="en-row">' +
      '<button class="en-btn" onclick="speakMeaning(' + w.n + ')" title="Play meaning">' + SPEAKER_SVG + '</button>' +
      '<span class="' + textClass + '">' + meaningText + '</span>' +
    '</div>' +
    '<span class="lv-tag ' + ((w.lv || "").toLowerCase()) + '">' + (w.lv || "") + '</span>';

  const fsCard = $("fsCard");

  if (direction) {
    const outClass = direction === "next" ? "fs-slide-out-left" : "fs-slide-out-right";
    const inClass = direction === "next" ? "fs-slide-in-right" : "fs-slide-in-left";
    fsCard.classList.remove("fs-slide-out-left", "fs-slide-out-right", "fs-slide-in-left", "fs-slide-in-right", "fs-fade-in");
    fsCard.classList.add(outClass);
    setTimeout(() => {
      fsCard.innerHTML = newContent;
      fsCard.classList.remove(outClass);
      fsCard.classList.add(inClass);
      if (autoplayActive && currentSpeakingBtn) {
        const btn = fsCard.querySelector("." + currentSpeakingBtn);
        if (btn) btn.classList.add("speaking");
      }
      setTimeout(() => fsCard.classList.remove(inClass), 350);
    }, 280);
  } else {
    fsCard.innerHTML = newContent;
    fsCard.classList.remove("fs-slide-out-left", "fs-slide-out-right", "fs-slide-in-left", "fs-slide-in-right", "fs-fade-in");
    void fsCard.offsetWidth;
    fsCard.classList.add("fs-fade-in");
    setTimeout(() => fsCard.classList.remove("fs-fade-in"), 350);
  }

  $("fsCounter").textContent = (idx + 1) + " / " + pool.length;
}

function fsNext() {
  const idx = autoplayActive ? autoplayIndex : selectedCardIndex;
  if (idx < pool.length - 1) {
    if (autoplayActive) autoplayIndex = idx + 1;
    else selectedCardIndex = idx + 1;
    renderFSCard("next");
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
    renderFSCard("prev");
    const newIdx = autoplayActive ? autoplayIndex : selectedCardIndex;
    setTimeout(() => {
      speechSynthesis.cancel();
      speakJP(pool[newIdx].n);
      setTimeout(() => { speakMeaning(pool[newIdx].n); }, 1800);
    }, 350);
  }
}

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
  if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });

  $("autoplayStatus").textContent = (autoplayIndex + 1) + " / " + pool.length;
  $("progressFill").style.width = ((autoplayIndex + 1) / pool.length * 100) + "%";

  const item = pool[autoplayIndex];
  speechSynthesis.cancel();

  if ($("fsOverlay").classList.contains("on")) {
    renderFSCard("next");
  }

  setTimeout(() => {
    const getButtons = () => {
      const cardEl = $("c" + item.n);
      const jpBtn = cardEl ? cardEl.querySelector(".jp-btn") : null;
      const enBtn = cardEl ? cardEl.querySelector(".en-btn") : null;
      const fsCard = $("fsCard");
      const fsJpBtn = fsCard ? fsCard.querySelector(".jp-btn") : null;
      const fsEnBtn = fsCard ? fsCard.querySelector(".en-btn") : null;
      return { cardEl, jpBtn, enBtn, fsJpBtn, fsEnBtn };
    };

    const { cardEl, jpBtn, enBtn, fsJpBtn, fsEnBtn } = getButtons();
    if (cardEl) cardEl.classList.add("speaking");
    if (jpBtn) jpBtn.classList.add("speaking");
    if (fsJpBtn) fsJpBtn.classList.add("speaking");
    currentSpeakingBtn = "jp-btn";

    const uJP = new SpeechSynthesisUtterance(stripTilde(item.r));
    uJP.lang = "ja-JP";
    const jpVoice = pickVoice("jpVoice", jpVoices);
    if (jpVoice) uJP.voice = jpVoice;
    uJP.rate = 0.9;

    const cfg = getLangConfig();
    const uMeaning = new SpeechSynthesisUtterance();
    uMeaning.text = stripTilde(getMeaningText(item));
    uMeaning.lang = cfg.langCode;
    const meaningVoice = pickVoice("meaningVoice", meaningVoices);
    if (meaningVoice) {
      uMeaning.voice = meaningVoice;
      uMeaning.lang = meaningVoice.lang || cfg.langCode;
    }
    uMeaning.rate = 0.9;

    uJP.onend = () => {
      const btns = getButtons();
      if (btns.jpBtn) btns.jpBtn.classList.remove("speaking");
      if (btns.fsJpBtn) btns.fsJpBtn.classList.remove("speaking");
      if (btns.enBtn) btns.enBtn.classList.add("speaking");
      if (btns.fsEnBtn) btns.fsEnBtn.classList.add("speaking");
      currentSpeakingBtn = "en-btn";
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

function createSakuraPetal() {
  const petal = document.createElement("div");
  petal.className = "sakura-petal";
  petal.textContent = "🌸";
  petal.style.left = Math.random() * 100 + "vw";
  petal.style.animation = `sakuraFall ${5 + Math.random() * 3}s linear ${Math.random() * 2}s`;
  document.body.appendChild(petal);
  setTimeout(() => { if (petal.parentNode) petal.remove(); }, 8000);
}

function startSakura() {
  setInterval(createSakuraPetal, 3000);
  for (let i = 0; i < 3; i++) setTimeout(createSakuraPetal, i * 500);
}
