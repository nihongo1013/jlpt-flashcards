function allItems() {
  const data = typeof DATA !== "undefined" ? DATA : {};
  const lv = $("lv").value;
  const parts = lv.split("+");
  let items = [];
  parts.forEach(key => {
    items = items.concat(data[key] || []);
  });
  return items;
}

function normalizeCat(c) {
  c = (c || "").replace(/^N[2-5]\s*/, "").replace(/\s+in\s+N[2-5]$/, "").replace(/^—\s*/, "");
  return CAT_MAP[c] || c;
}

function fillCats() {
  const catSet = new Set();
  allItems().forEach(w => {
    const c = normalizeCat(w.c || "");
    if (c) catSet.add(c);
  });
  const cats = [...catSet].sort();
  const sel = $("cat");
  const cur = sel.value;
  sel.innerHTML = '<option value="">All categories</option>' +
    cats.map(c => '<option>' + c + '</option>').join("");
  if (cats.includes(cur)) sel.value = cur;
}

function getLangConfig() {
  return LANGUAGES[selectedLang] || LANGUAGES[DEFAULT_LANG];
}

function getMeaningText(w) {
  const cfg = getLangConfig();
  return (w[cfg.field] || "").trim() || w.m || "";
}

function getMeaningTextClass() {
  return getLangConfig().textClass;
}

function getLangLabel() {
  return getLangConfig().label;
}

function languageSearchFields() {
  return ["w", "r", "ro"].concat(Object.keys(LANGUAGES).map(k => LANGUAGES[k].field));
}

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function filter() {
  const q = $("q").value.toLowerCase().trim();
  const cat = $("cat").value;
  let items = allItems();
  if (cat) items = items.filter(w => normalizeCat(w.c || "") === cat);
  if (q) {
    const fields = languageSearchFields();
    items = items.filter(w => fields.some(f => (w[f] || "").toLowerCase().includes(q)));
  }
  pool = shuffled ? shuffle(items) : items;
  render();
}
