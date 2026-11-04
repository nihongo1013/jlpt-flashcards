function getBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes("Edg")) return "edge";
  if (ua.includes("Chrome")) return "chrome";
  if (ua.includes("Firefox")) return "firefox";
  if (ua.includes("Safari")) return "safari";
  return "other";
}

function findBestVoiceIndex(voices) {
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

function voicesForLang(langCode) {
  const prefix = langCode.split("-")[0];
  const exact = allVoices.filter(v => v.lang === langCode);
  if (exact.length) return exact;
  return allVoices.filter(v => v.lang.startsWith(prefix));
}

function fillVoiceSelect(sel, voices, autoLabel) {
  sel.innerHTML = '<option value="">' + autoLabel + '</option>' +
    voices.map((v, i) => '<option value="' + i + '">' + v.name + " (" + v.lang + ")</option>").join("");
  const defIdx = findBestVoiceIndex(voices);
  if (defIdx >= 0) sel.selectedIndex = defIdx + 1;
}

function loadVoices() {
  allVoices = speechSynthesis.getVoices();
  jpVoices = voicesForLang("ja-JP");
  fillVoiceSelect($("jpVoice"), jpVoices, "JP Voice (auto)");
  updateMeaningVoices();
}

function updateMeaningVoices() {
  const cfg = getLangConfig();
  meaningVoices = voicesForLang(cfg.langCode);
  const sel = $("meaningVoice");
  const label = $("meaningVoiceLabel");
  if (label) label.textContent = "🗣️ " + cfg.label + " Voice";

  if (!meaningVoices.length) {
    meaningVoices = voicesForLang("en-US");
    fillVoiceSelect(sel, meaningVoices, "No " + cfg.label + " voice — English (auto)");
    return;
  }
  fillVoiceSelect(sel, meaningVoices, cfg.label + " Voice (auto)");
}

function initVoices() {
  if (typeof speechSynthesis === "undefined") return;
  if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = loadVoices;
  setTimeout(loadVoices, 50);
  setTimeout(loadVoices, 300);
  setTimeout(loadVoices, 1000);
}

function stripTilde(text) {
  return (text || "").replace(/[〜~]/g, "").replace(/\*\*\//g, "").trim();
}

function pickVoice(selectId, voices) {
  const idx = parseInt($(selectId).value);
  if (!isNaN(idx) && voices[idx]) return voices[idx];
  const best = findBestVoiceIndex(voices);
  return best >= 0 ? voices[best] : null;
}

function speakJP(n) {
  const item = pool.find(w => w.n === n);
  if (!item) return;
  const card = $("c" + n);
  const btn = card ? card.querySelector(".jp-btn") : null;
  const fsBtn = document.querySelector("#fsCard .jp-btn");
  if (card) card.classList.add("speaking");
  if (btn) btn.classList.add("speaking");
  if (fsBtn) fsBtn.classList.add("speaking");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(stripTilde(item.r));
  u.lang = "ja-JP";
  const voice = pickVoice("jpVoice", jpVoices);
  if (voice) u.voice = voice;
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
  const btn = card ? card.querySelector(".en-btn") : null;
  const fsBtn = document.querySelector("#fsCard .en-btn");
  if (card) card.classList.add("speaking");
  if (btn) btn.classList.add("speaking");
  if (fsBtn) fsBtn.classList.add("speaking");
  speechSynthesis.cancel();
  const cfg = getLangConfig();
  const u = new SpeechSynthesisUtterance();
  u.text = stripTilde(getMeaningText(item));
  u.lang = cfg.langCode;
  const voice = pickVoice("meaningVoice", meaningVoices);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang || cfg.langCode;
  }
  u.rate = 0.9;
  u.onend = () => {
    if (card) card.classList.remove("speaking");
    if (btn) btn.classList.remove("speaking");
    if (fsBtn) fsBtn.classList.remove("speaking");
  };
  u.onerror = u.onend;
  speechSynthesis.speak(u);
}
