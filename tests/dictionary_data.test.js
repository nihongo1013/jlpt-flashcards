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
    "frontVoice", "backVoice", "showContext", "dataNote", "pairFields",
  ]) {
    assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  }
  assert.ok(html.includes("data/dictionary/meta.js"));
  assert.ok(html.includes("js/dictionary.js"));
});
