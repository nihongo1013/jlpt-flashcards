/* Browser-independent checks for the offline dictionary data and card builder.
 * Run with: node --test tests/dictionary_data.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const DICT_DIR = path.join(ROOT, "data", "dictionary");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");

const context = vm.createContext({
  window: {},
  document: {
    createElement: () => ({ dataset: {}, appendChild() {} }),
    head: { appendChild() {} },
  },
  console,
  Intl,
  URLSearchParams,
});
context.window.window = context.window;

// One script keeps browser-style top-level const/let bindings in a shared scope.
const appBundle = [
  "js/config.js",
  "data/dictionary/meta.js",
  "js/state.js",
  "js/dictionary.js",
].map(file => read(file)).join("\n;\n");
vm.runInContext(appBundle, context, { filename: "dictionary-app-bundle.js" });

const meta = context.window.DICTIONARY_META;
const packs = context.window.DICTIONARY_PACKS;

for (const [code, info] of Object.entries(meta.packs)) {
  const file = path.join(DICT_DIR, info.path);
  vm.runInContext(fs.readFileSync(file, "utf8"), context, {
    filename: info.path,
    timeout: 10000,
  });
  assert.ok(packs[code], `pack ${code} did not register`);
}

const build = (from, to) =>
  vm.runInContext(`buildDictionaryCards(${JSON.stringify(from)}, ${JSON.stringify(to)})`, context);
const evaluate = expression => vm.runInContext(expression, context);

test("metadata describes a human-edited, API-free source", () => {
  assert.equal(meta.source.humanEditedOnly, true);
  assert.equal(meta.source.license, "CC BY-SA 4.0");
  assert.equal(meta.languages.length, 109);
  assert.equal(meta.concepts.length, 9852);
  assert.equal(Object.keys(meta.packs).length, meta.stats.languages);
  assert.ok(meta.stats.excludedMachineTranslations > 0);
  assert.ok(meta.stats.minPairCards > 0);
});

test("every language pair has shared, human-edited concepts", () => {
  const conceptSets = new Map(
    Object.entries(packs).map(([code, pack]) => [
      code,
      new Set(pack.entries.map(entry => entry[0])),
    ])
  );
  const codes = [...conceptSets.keys()].sort();
  let minimum = Infinity;
  let pairCount = 0;
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const left = conceptSets.get(codes[i]);
      const right = conceptSets.get(codes[j]);
      let shared = 0;
      for (const index of left) if (right.has(index)) shared++;
      assert.ok(shared > 0, `${codes[i]} ↔ ${codes[j]} has no shared senses`);
      minimum = Math.min(minimum, shared);
      pairCount++;
    }
  }
  assert.equal(pairCount, meta.stats.languagePairs);
  assert.equal(minimum, meta.stats.minPairCards);
});

test("packs contain no generated-translation markers", () => {
  for (const info of Object.values(meta.packs)) {
    const text = fs.readFileSync(path.join(DICT_DIR, info.path), "utf8");
    assert.ok(!text.includes('"src":"ai"'));
    assert.ok(!text.includes('"low":1'));
  }
});

test("card builder aligns two dictionary languages by concept", () => {
  const cards = build("ja", "en");
  assert.ok(cards.length > 8000, `expected thousands of ja→en cards, got ${cards.length}`);
  for (const card of cards.slice(0, 250)) {
    assert.equal(card.mode, "dictionary");
    assert.equal(card.front.code, "ja");
    assert.equal(card.back.code, "en");
    assert.ok(card.front.word);
    assert.ok(card.back.word);
    assert.match(card.sourceUrl, /^https:\/\/en\.wiktionary\.org\/wiki\//);
    assert.ok(card.front.terms.every(term => !("src" in term) && !("low" in term)));
    assert.ok(card.back.terms.every(term => !("src" in term) && !("low" in term)));
    assert.ok(card.searchText.includes("japanese"));
  }
  const smallest = build("hmn", "rw");
  assert.equal(smallest.length, meta.stats.minPairCards);
  assert.equal(build("not-a-language", "en").length, 0);
});

test("shared helpers escape dictionary text and reject unsafe URLs", () => {
  assert.equal(evaluate('escapeHtml("<b>&\\\"x\\\"</b>")'), "&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;");
  assert.equal(evaluate('safeUrl("data/dictionary/ATTRIBUTION.md")'), "data/dictionary/ATTRIBUTION.md");
  assert.equal(evaluate('safeUrl("javascript:alert(1)")'), "");
  assert.equal(evaluate('stripTilde("〜走る")'), "走る");
});

test("popular quick-picks are backed by metadata and packs", () => {
  const codes = evaluate("POPULAR_LANGUAGE_CODES");
  assert.ok(codes.length >= 60);
  assert.equal(new Set(codes).size, codes.length);
  const supported = new Set(meta.languages.map(item => item.code));
  for (const code of codes) {
    assert.ok(supported.has(code), `unknown popular language ${code}`);
    assert.ok(meta.packs[code], `missing pack for popular language ${code}`);
  }
});

test("HTML exposes the two language fields, new name, and new modules", () => {
  const html = read("index.html");
  assert.match(html, /<title>Lingua Pairs/);
  assert.match(html, /class="brand-name">Lingua Pairs/);
  assert.ok(!html.includes("JLPT Flashcards"));
  for (const id of [
    "deckMode", "sourceLang", "targetLang", "swapLangs", "langSelect",
    "frontVoice", "backVoice", "showContext", "pairFields",
    "speedSlider", "cardSizeSlider", "autoplayBar", "fsCounter",
  ]) {
    assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  }
  assert.ok(html.includes("data/dictionary/meta.js"));
  assert.ok(html.includes("js/dictionary.js"));
});

test("frontend copy stays minimal and deck label has no CSV annotation", () => {
  const html = read("index.html");
  const ui = read("js/ui.js");
  const dictionary = read("js/dictionary.js");
  const forbidden = [
    "white peacock", "Cruise Ship Resort", "Wiktionary", "Human-edited dictionary sense",
    "109 languages · authentic dictionary senses · no translation API", "Front / prompt",
    "Back / answer", "Front ·", "Back ·", "legacy CSV", "id=\"dataNote\"",
    "brand-tagline", "OFFLINE DICTIONARY DATA", "LEGACY JLPT CSV",
  ];
  for (const phrase of forbidden) {
    assert.ok(!html.includes(phrase), `unwanted HTML copy: ${phrase}`);
    assert.ok(!ui.includes(phrase), `unwanted UI copy: ${phrase}`);
  }
  assert.ok(!dictionary.includes("Human-edited dictionary sense"));
  assert.ok(!dictionary.includes("sourceNote"));
  assert.ok(!dictionary.includes("sourceLabel"));
  assert.ok(!read("js/data.js").includes("Legacy JLPT deck"));
  assert.ok(!ui.includes("card-source"));
  assert.match(html, /<option value="jlpt">JLPT Japanese<\/option>/);
  assert.ok(!html.includes("JLPT Japanese (legacy CSV)"));
});

test("fullscreen and first page keep navigation controls", () => {
  const html = read("index.html");
  const css = read("css/styles.css");
  const ui = read("js/ui.js");
  assert.match(html, /class="fs-stage" id="fsCard"/);
  assert.ok(!css.includes(".fs-card"));
  assert.ok(!ui.includes("fs-mode"));
  assert.match(ui, /const rootClass = "card" \+ \(index === selectedCardIndex \? " active" : ""\);/);
  assert.match(ui, /function renderFSCard[\s\S]*renderCardContent\(pool\[index\], index, true\)/);
  assert.match(ui, /bar\.classList\.toggle\("hidden", autoplayActive \|\| fullscreen\)/);
  assert.ok(html.includes('id="autoplayBar"'));
  assert.ok(html.includes('class="fs-nav"'));
  assert.ok(html.includes('id="fsCounter"'));
  assert.ok(html.includes('id="autoplayStatus"'));
  assert.ok(html.includes('id="progressFill"'));
  assert.ok(ui.includes("function updatePlayer()"));
  assert.ok(ui.includes("function nextCard()"));
  assert.ok(ui.includes("function prevCard()"));
  assert.ok(!html.includes('id="status"'));
  for (const name of ["startAutoplay", "stopAutoplay", "toggleFullscreen", "closeFullscreen"]) {
    const match = ui.match(new RegExp(`function ${name}\\(\\) \\{([\\s\\S]*?)\\n\\}`));
    assert.ok(match, `missing ${name}`);
    assert.match(match[1], /updatePlaybackChrome\(\)/);
  }
});

test("design skills are integrated into the frontend layer", () => {
  const html = read("index.html");
  const css = read("css/redesign.css");
  const legacyCss = read("css/styles.css");
  const design = read("DESIGN.md");
  const ui = read("js/ui.js");
  const app = read("js/app.js");
  const config = read("js/config.js");
  const speech = read("js/speech.js");
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
  for (const [name, text] of Object.entries({ html, css, legacyCss, design, ui, app, config, speech })) {
    assert.ok(!emoji.test(text), `decorative glyph in ${name}`);
    assert.ok(!text.includes("\u2014"), `em dash in ${name}`);
    assert.ok(!text.includes("\u2013"), `en dash in ${name}`);
  }
  assert.ok(html.includes("css/redesign.css"));
  assert.ok(css.includes("--surface-page"));
  assert.ok(css.includes("--font-display"));
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
  assert.ok(css.includes("prefers-color-scheme: dark"));
  assert.ok(design.includes("Operate"));
  assert.ok(design.includes("www.ui-skills.com"));
  assert.ok(design.includes("agenticskills.io/category/design"));
  assert.ok(design.includes("plugin87/ux-ui-agent-skills"));
  assert.ok(design.includes("Playback speed"));
  assert.ok(design.includes("Card size"));
  assert.ok(ui.includes("card-meta"));
  assert.ok(ui.includes("card-index"));
  assert.ok(ui.includes("card-pair"));
  assert.ok(ui.includes("term-text"));
  assert.ok(ui.includes("fitCardsToViewport"));
  assert.ok(ui.includes("fitFullscreenCard"));
  assert.ok(ui.includes("fitCardText"));
  assert.ok(ui.includes("updatePlayer"));
  assert.ok(speech.includes("speechRate"));
  assert.ok(app.includes("cardSizeScale"));
  assert.ok(!ui.includes("side-head"));
  assert.ok(!ui.includes("side-label"));
  assert.ok(!ui.includes("card-pos"));
  assert.ok(!ui.includes("setStatus"));
  assert.ok(!app.includes("startSakura"));
  assert.ok(!ui.includes("createSakuraPetal"));
});

test("cards fit the viewport, restore controls, and rotate accents", () => {
  const html = read("index.html");
  const css = read("css/redesign.css");
  const ui = read("js/ui.js");
  const app = read("js/app.js");
  const state = read("js/state.js");
  const speech = read("js/speech.js");
  assert.ok(!html.includes('id="status"'));
  assert.ok(html.includes('id="autoplayBar"'));
  assert.ok(html.includes('class="fs-nav"'));
  assert.ok(html.includes('id="autoplayStatus"'));
  assert.ok(html.includes('id="progressFill"'));
  assert.ok(html.includes('id="fsCounter"'));
  assert.ok(html.includes('id="speedSlider"'));
  assert.ok(html.includes('id="cardSizeSlider"'));
  assert.ok(html.includes("settings-icon"));
  assert.ok(html.includes('id="instaBtn"'));
  assert.ok(html.includes("https://www.instagram.com/nihongo_1013"));
  assert.ok(css.includes("--card-height"));
  assert.ok(css.includes("--fs-stage-height"));
  assert.ok(css.includes("--fs-nav-reserve"));
  assert.ok(!css.includes("--card-scale"));
  assert.ok(!css.includes("--fs-scale"));
  assert.ok(!css.includes("zoom:"));
  assert.ok(css.includes("height: var(--card-height, 300px)"));
  assert.ok(css.includes("height: var(--fs-stage-height)"));
  assert.ok(css.includes(".autoplay-bar {"));
  assert.ok(css.includes(".fs-nav {"));
  assert.match(css, /\.side-line \{[\s\S]*?align-items: center;/);
  assert.ok(css.includes(':root[data-accent="oxide"]'));
  assert.ok(css.includes(':root[data-accent="indigo"]'));
  assert.ok(css.includes(':root[data-accent="plum"]'));
  assert.ok(css.includes(':root[data-accent="teal"]'));
  assert.ok(css.includes(':root[data-accent="umber"]'));
  assert.ok(app.includes("ACCENT_KEYS"));
  assert.ok(app.includes("applyRandomAccent"));
  assert.ok(app.includes("accent: currentAccent"));
  assert.ok(app.includes("speechRate: speechRate"));
  assert.ok(app.includes("cardSizeScale: cardSizeScale"));
  assert.ok(ui.includes("fitCardText"));
  assert.ok(ui.includes("nextCard"));
  assert.ok(ui.includes("prevCard"));
  assert.ok(ui.includes("updatePlayer"));
  assert.match(ui, /const ordinal = String\(index \+ 1\);/);
  assert.match(ui, /window\.innerHeight - top - playerHeight - gap/);
  assert.match(ui, /stage\.style\.setProperty\("--fs-stage-height"/);
  assert.match(state, /let speechRate = 1;/);
  assert.match(state, /let cardSizeScale = 1;/);
  assert.match(speech, /utterance\.rate = \(typeof speechRate/);
  assert.match(speech, /function playbackGap/);
  assert.match(state, /let showSenseContext = false;/);
  assert.ok(!html.includes('id="showContext" checked'));
});

test("settings expose playback speed and proportional card size", () => {
  const html = read("index.html");
  const app = read("js/app.js");
  const speech = read("js/speech.js");
  const ui = read("js/ui.js");
  const state = read("js/state.js");
  assert.match(html, /id="speedSlider"[^>]*min="0\.5"[^>]*max="2"/);
  assert.match(html, /id="cardSizeSlider"[^>]*min="0\.7"[^>]*max="1\.5"/);
  assert.match(app, /\$\("speedSlider"\)\.addEventListener\("input"/);
  assert.match(app, /\$\("cardSizeSlider"\)\.addEventListener\("input"/);
  assert.match(app, /speechRate: speechRate/);
  assert.match(app, /cardSizeScale: cardSizeScale/);
  assert.match(state, /let cardSizeScale = 1;/);
  assert.match(speech, /utterance\.rate = \(typeof speechRate/);
  assert.match(speech, /return Math\.max\(120, Math\.round\(baseMs \/ rate\)\)/);
  assert.match(ui, /function updateSettingsControls/);
  assert.match(ui, /const height = baseHeight \* scale;/);
  assert.match(ui, /const maxFont = \(mobile \? 56 : 96\) \* scale/);
  assert.match(ui, /const visibleCards = mobile \? 2 : 3;/);
  assert.match(ui, /const minimum = mobile \? 160 : 80;/);
});

test("wide and small portrait cards use separate layout logic", () => {
  const html = read("index.html");
  const css = read("css/redesign.css");
  const ui = read("js/ui.js");
  const app = read("js/app.js");
  assert.match(html, /data-layout="wide"/);
  assert.match(ui, /function updateLayoutMode/);
  assert.match(ui, /document\.documentElement\.dataset\.layout = mobile \? "mobile" : "wide"/);
  assert.match(app, /updateLayoutMode\(\)/);
  assert.match(css, /\[data-layout="wide"\] \.card-sides \{[\s\S]*?display: grid;/);
  assert.match(css, /\[data-layout="mobile"\] \.card-sides \{[\s\S]*?flex: 0 1 auto;/);
  assert.match(css, /\[data-layout="mobile"\] \.term-text \{[\s\S]*?white-space: nowrap;/);
  assert.match(css, /\.side-line \{[\s\S]*?gap: clamp\(14\s*px, 1\.5vw, 24\s*px\)/);
});

test("speech text never contains dots or other punctuation", () => {
  const config = read("js/config.js");
  const speech = read("js/speech.js");
  assert.match(config, /function cleanSpeechText/);
  assert.ok(config.includes('/[\\p{P}\\p{S}]+/gu'));
  assert.match(speech, /cleanSpeechText\(stripTilde\(/);
  assert.equal(evaluate('cleanSpeechText("A... B!! (C), 100%")'), "A B C 100");
  const spokenVm = vm.createContext({
    window: {},
    document: { getElementById: () => null, querySelectorAll: () => [] },
    navigator: { userAgent: "Chrome/130.0.0.0" },
    SpeechSynthesisUtterance: function (text) { this.text = text; },
    speechSynthesis: { getVoices: () => [] },
    console,
    Intl,
    setTimeout,
  });
  const bundle = ["js/config.js", "js/state.js", "js/speech.js"]
    .map(file => read(file)).join("\n;\n");
  vm.runInContext(bundle, spokenVm, { filename: "speech-bundle.js" });
  const spoken = vm.runInContext(
    'makeUtterance({ front: { speakText: "Wait... please!", locale: "en-US" } }, "front").text',
    spokenVm,
  );
  assert.equal(spoken, "Wait please");
});

const speechContext = userAgent => {
  const speechVm = vm.createContext({
    navigator: { userAgent },
    document: {},
    console,
  });
  vm.runInContext(read("js/speech.js"), speechVm, { filename: "speech.js" });
  return expression => vm.runInContext(expression, speechVm);
};

test("default voice follows the user's browser family", () => {
  const voices = [
    { name: "Microsoft Aria Natural", lang: "en-US", default: true, localService: false },
    { name: "Google US English", lang: "en-US", default: false, localService: true },
    { name: "Siri Voice 5", lang: "en-US", default: false, localService: true },
    { name: "Mozilla en-US", lang: "en-US", default: false, localService: true },
    { name: "Opera Voice", lang: "en-US", default: false, localService: true },
  ];
  const pick = (ua, expectedName) => {
    const evaluate = speechContext(ua);
    const index = evaluate(`findBestVoiceIndex(${JSON.stringify(voices)})`);
    assert.equal(voices[index].name, expectedName, ua);
  };
  pick("Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36", "Google US English");
  pick("Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0", "Microsoft Aria Natural");
  pick("Mozilla/5.0 Version/18.0 Safari/605.1.15", "Siri Voice 5");
  pick("Mozilla/5.0 Firefox/132.0", "Mozilla en-US");
  pick("Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0", "Opera Voice");
});
