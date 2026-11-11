/* Web Speech API helpers for either side of a card */

function canSpeak() {
  return typeof speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined";
}

function currentSideConfig(side) {
  if (deckMode === "dictionary") {
    const language = dictionaryLanguage(side === "front" ? sourceLang : targetLang);
    return {
      label: language.native || language.name,
      name: language.name,
      locale: language.locale || language.code,
      rtl: !!language.rtl,
    };
  }
  if (side === "front") {
    return { label: "日本語", name: "Japanese", locale: "ja-JP", rtl: false };
  }
  const cfg = getLangConfig();
  return { label: cfg.label, name: cfg.label, locale: cfg.langCode, rtl: false };
}

function canonicalLang(lang) {
  return String(lang || "").replace(/_/g, "-").toLowerCase();
}

function voicesForLocale(locale) {
  if (!locale || !allVoices.length) return [];
  const wanted = canonicalLang(locale);
  const prefix = wanted.split("-")[0];
  const exact = allVoices.filter(voice => canonicalLang(voice.lang) === wanted);
  if (exact.length) return exact;
  const family = allVoices.filter(voice => {
    const lang = canonicalLang(voice.lang);
    return lang === prefix || lang.startsWith(prefix + "-");
  });
  if (family.length) return family;
  return allVoices.filter(voice => canonicalLang(voice.lang).startsWith(prefix));
}

function browserVoiceHints() {
  if (typeof navigator === "undefined") return [];
  const ua = String(navigator.userAgent || "");
  const brands = navigator.userAgentData && Array.isArray(navigator.userAgentData.brands)
    ? navigator.userAgentData.brands.map(item => item.brand || "").join(" ")
    : "";
  // Prefer the voice family that the current browser actually ships with.
  if (/edg(?:e|ios|a)?\//i.test(ua) || /microsoft edge|edge/i.test(brands)) {
    return ["Microsoft", "Edge"];
  }
  if (/opr\//i.test(ua) || /opera/i.test(brands)) {
    return ["Opera", "Google"];
  }
  if (/crios\//i.test(ua) || /chrome\//i.test(ua) || /google chrome|chromium/i.test(brands)) {
    return ["Google", "Chrome"];
  }
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua) && !/crios\//i.test(ua) && !/chromium\//i.test(ua)) {
    return ["Siri", "Samantha", "Apple", "Alex", "Daniel", "Karen", "Moira",
      "Tessa", "Veena", "Kyoko", "Otoya", "Agnes", "Fred"];
  }
  if (/firefox\//i.test(ua) || /fxios\//i.test(ua) || /firefox/i.test(brands)) {
    return ["Firefox", "Mozilla"];
  }
  return [];
}

function findBestVoiceIndex(voices, hints) {
  if (!voices || !voices.length) return -1;
  const vendorHints = Array.isArray(hints) ? hints : browserVoiceHints();
  let bestIndex = 0;
  let bestScore = -1;
  voices.forEach((voice, index) => {
    const name = String(voice.name || "").toLowerCase();
    let score = 0;
    for (let hintIndex = 0; hintIndex < vendorHints.length; hintIndex++) {
      if (name.includes(String(vendorHints[hintIndex]).toLowerCase())) {
        score += (vendorHints.length - hintIndex) * 1000;
        break;
      }
    }
    if (voice.default) score += 100;
    if (voice.localService) score += 50;
    if (/enhanced|premium|natural|neural|siri/i.test(name)) score += 20;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function fillVoiceSelect(select, voices, autoLabel) {
  if (!select) return;
  select.innerHTML = "";
  const auto = document.createElement("option");
  auto.value = "";
  auto.textContent = autoLabel;
  select.appendChild(auto);
  voices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = voice.name + " (" + voice.lang + ")";
    select.appendChild(option);
  });
  const best = findBestVoiceIndex(voices);
  select.selectedIndex = best >= 0 ? best + 1 : 0;
}

function updateVoiceSelects() {
  const front = currentSideConfig("front");
  const back = currentSideConfig("back");
  voicesBySide.front = voicesForLocale(front.locale);
  voicesBySide.back = voicesForLocale(back.locale);

  const frontLabel = $("frontVoiceLabel");
  const backLabel = $("backVoiceLabel");
  if (frontLabel) frontLabel.textContent = front.label + " voice";
  if (backLabel) backLabel.textContent = back.label + " voice";

  fillVoiceSelect($("frontVoice"), voicesBySide.front, "Browser default");
  fillVoiceSelect($("backVoice"), voicesBySide.back, "Browser default");

  const notice = $("voiceNotice");
  if (notice) {
    if (!canSpeak()) {
      notice.textContent = "Speech synthesis unavailable.";
      notice.classList.remove("hidden");
    } else if (!allVoices.length || !voicesBySide.front.length || !voicesBySide.back.length) {
      notice.textContent = "Using browser default voice.";
      notice.classList.remove("hidden");
    } else {
      notice.textContent = "";
      notice.classList.add("hidden");
    }
  }
}

function loadVoices() {
  allVoices = canSpeak() ? (speechSynthesis.getVoices() || []) : [];
  updateVoiceSelects();
}

function initVoices() {
  if (!canSpeak()) {
    loadVoices();
    return;
  }
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  setTimeout(loadVoices, 50);
  setTimeout(loadVoices, 300);
  setTimeout(loadVoices, 1000);
}

function pickVoice(selectId, voices) {
  const select = $(selectId);
  if (!select) return findBestVoiceIndex(voices) >= 0 ? voices[findBestVoiceIndex(voices)] : null;
  const index = parseInt(select.value, 10);
  if (!isNaN(index) && voices[index]) return voices[index];
  const best = findBestVoiceIndex(voices);
  return best >= 0 ? voices[best] : null;
}

function makeUtterance(card, side) {
  const data = card && card[side];
  if (!data) return null;
  const text = stripTilde(data.speakText || data.word || "");
  if (!text) return null;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = data.locale || "en-US";
  const voice = pickVoice(side === "front" ? "frontVoice" : "backVoice", voicesBySide[side] || []);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || utterance.lang;
  }
  utterance.rate = 0.9;
  return utterance;
}

function setSpeakingState(index, side, on) {
  if (on) {
    document.querySelectorAll(".card.speaking").forEach(card => card.classList.remove("speaking"));
    document.querySelectorAll(".speak-btn.speaking").forEach(btn => btn.classList.remove("speaking"));
  }
  document.querySelectorAll('.card[data-index="' + index + '"]').forEach(card => {
    card.classList.toggle("speaking", !!on);
  });
  document.querySelectorAll('.speak-btn[data-index="' + index + '"]').forEach(btn => {
    if (!on || btn.dataset.side === side) btn.classList.toggle("speaking", !!on);
  });
  currentSpeakingBtn = on ? side : null;
}

function speakCardSide(index, side) {
  const card = pool[index];
  if (!card) return;
  if (!canSpeak()) return;
  const utterance = makeUtterance(card, side);
  if (!utterance) return;
  speechSynthesis.cancel();
  setSpeakingState(index, side, true);
  const finish = () => setSpeakingState(index, side, false);
  utterance.onend = finish;
  utterance.onerror = finish;
  speechSynthesis.speak(utterance);
}

/* Speak front then back. Used by fullscreen navigation and autoplay. */
function playCardPair(index, onDone, isActive) {
  const active = typeof isActive === "function" ? isActive : () => true;
  const card = pool[index];
  if (!card) return;
  const first = canSpeak() ? makeUtterance(card, "front") : null;
  const second = canSpeak() ? makeUtterance(card, "back") : null;
  if (!first || !second) {
    if (onDone && active()) setTimeout(onDone, 600);
    return;
  }

  let completed = false;
  const cleanup = () => {
    setSpeakingState(index, "front", false);
    setSpeakingState(index, "back", false);
  };
  const finish = shouldAdvance => {
    cleanup();
    if (completed || !onDone || !shouldAdvance || !active()) return;
    completed = true;
    onDone();
  };

  speechSynthesis.cancel();
  setSpeakingState(index, "front", true);
  first.onend = () => {
    if (!active()) { cleanup(); return; }
    setSpeakingState(index, "front", false);
    setSpeakingState(index, "back", true);
    setTimeout(() => {
      if (!active()) { cleanup(); return; }
      speechSynthesis.speak(second);
    }, 350);
  };
  first.onerror = () => finish(active());
  second.onend = () => finish(true);
  second.onerror = () => finish(active());
  speechSynthesis.speak(first);
}
