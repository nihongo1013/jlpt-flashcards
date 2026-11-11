# Lingua Pairs

A static flashcard app for learning between two languages. It grew from a
Japanese-only JLPT deck and now has two decks:

1. **Dictionary pairs** (default): choose *any two* languages from 109 bundled
   languages. Cards are built from **human-edited dictionary senses**, not from
   a translation API or a translation model.
2. **JLPT Japanese**: the original N5 to N1 deck from `Vocabulary.csv`, with
   complete English and Hindi meaning columns.

## Features

- 109 languages, including Japanese, English, Hindi, Telugu, Kannada, Tamil,
  Arabic, French, Spanish, Chinese, Korean, and many more. **82 widely used
  languages appear first** in a “Popular languages” quick-pick group; the rest
  remain available in regional groups.
- 5,886 unordered language pairs. Every bundled pair has at least **65**
  dictionary-attested cards; common pairs have thousands.
- Two visible language fields with a swap button. The app loads only the two
  local language packs you select.
- A card appears only when **both** selected languages have a human-edited
  dictionary entry for the same Wiktionary sense. The app never translates one
  side into the other.
- Compact cards show the word, its reading when needed, the paired sense, an
  ordinal, the pair label, and one category or part of speech tag. Language
  names are not repeated beside each side, and duplicate part of speech text is
  omitted.
- An optional English sense gloss or definition can be enabled in settings for
  disambiguation. It is off by default to keep cards compact. RTL text is
  supported where the source language needs it.
- No status, count, or coverage line. No bottom player in fullscreen, autoplay,
  or any other mode. Fullscreen reuses the first page card and always fits the
  viewport.
- The first screen keeps at least two full cards visible. A different accent
  theme is chosen at random after a language change; the choice is saved with
  the other preferences.
- A sliders settings icon and the original Instagram link mark are restored to
  the header.
- Web Speech voices for both selected languages. The default voice follows the
  browser family (Google on Chrome/Chromium, Microsoft on Edge, Siri/Apple on
  Safari, and equivalent vendor voices elsewhere), while falling back to the
  browser default when no matching voice is installed.
- Search, category filter, JLPT level filter, shuffle, fullscreen, autoplay,
  chunked card rendering, and saved language pair and accent preferences.
- **No runtime network requests for card data. No translation API.**

## Design system

The interface follows [`DESIGN.md`](DESIGN.md): an editorial, task first dictionary spread built from semantic tokens, six WCAG AA accent themes, compact viewport fitting cards, 44px touch targets, visible focus, reduced motion support, and no decorative emoji or gradients. The guidance is adapted from [UI Skills](https://www.ui-skills.com/), the [AgenticSkills design category](https://agenticskills.io/category/design), and [plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills).

## Workflow

After coding, commit on the active branch, push it, open a PR to `main`, and merge that PR. Do not leave completed work only in the working tree.

## Quick start

The app is plain HTML/CSS/vanilla JavaScript. Open `index.html`, or serve the
folder (recommended for browsers with strict `file://` script rules):

```bash
python3 -m http.server 8765
```

Then visit `http://127.0.0.1:8765/`. You can also share a pair directly:
`?from=ja&to=fr`.

## Where the dictionary data comes from

The dictionary packs are a compact, derived build of the **English
Wiktionary translation tables**, extracted by Wiktextract / kaikki.org and
packaged in
[MethodoxTech/Multilingualism](https://github.com/MethodoxTech/Multilingualism)
at pinned commit `fe427837f392a90f8d68a3e69c7c9f3c1f716bb9`.

That upstream snapshot also contains AI-generated translations for coverage
gaps. **All 544,786 `src: "ai"` entries and all low-confidence entries are
excluded by the builder.** Only primary Wiktionary senses and human-edited
translations are kept.

A concept is one English Wiktionary headword plus its primary sense. For each
concept, each language pack stores the dictionary's own attestations. When you
select, for example, `hi → te`, the app intersects the Hindi and Telugu packs
and shows only concepts attested in both. It does **not** call Hindi→Telugu
translation, nor translate through English at runtime.

This is concept-aligned dictionary data, not a claim that every pair has a
dedicated hand-written bilingual dictionary. If you need direct commercial
bilingual dictionaries, add a licensed extractor to
`scripts/build_dictionary_packs.py` and regenerate the packs.

### Coverage

| Metric | Count |
|---|---:|
| Languages (including English) | 109 |
| Wiktionary concepts | 9,852 |
| Human-edited concept/language attestations | 529,078 |
| Human-edited terms (including English headwords) | 780,518 |
| Language pairs with cards | 5,886 / 5,886 |
| Smallest pair (`hmn` ↔ `rw`) | 65 cards |

See [`data/dictionary/ATTRIBUTION.md`](data/dictionary/ATTRIBUTION.md) for the
full attribution, changes, and licence notice. Derived dictionary data is
**CC BY-SA 4.0**; the upstream licence text is copied to
`data/dictionary/SOURCE-LICENSE.txt`.

### Popular international languages

The two language fields start with a **Popular languages** group containing 82
widely used languages. It includes the major global/UN languages, the most
common European languages, and major Asian, Indian, Middle-Eastern, African,
and Austronesian/Oceanic languages, for example:

- English, French, Spanish, Arabic, Russian, Chinese (Simplified and Traditional)
- German, Portuguese, Italian, Dutch, Polish, Swedish, Norwegian, Danish,
  Finnish, Greek, Czech, Romanian, Hungarian, Ukrainian
- Japanese, Korean, Hindi, Bengali, Telugu, Tamil, Urdu, Marathi, Gujarati,
  Kannada, Malayalam, Odia, Punjabi, Nepali, Sinhala
- Turkish, Persian, Hebrew, Indonesian, Malay, Vietnamese, Thai, Filipino,
  Burmese, Khmer, Lao
- Swahili, Afrikaans, Amharic, Hausa, Igbo, Yoruba, Somali, Zulu, Xhosa,
  Māori, Samoan, Hawaiian, Cebuano, Javanese, Sundanese, Hmong

All 109 language codes are listed in `data/dictionary/meta.js`; the remaining
languages are grouped by region under “More …”. Spanish and Portuguese are
single language entries rather than separate regional variants, while Chinese
is split into Simplified and Traditional where the source dictionary does so.

## Rebuilding the dictionary packs

Generated packs are committed so the static site works without a build step.
To regenerate them from the pinned source snapshot:

```bash
python3 scripts/build_dictionary_packs.py
```

This downloads the source tarball from `codeload.github.com` into the ignored
`.cache/` directory. No translation service is contacted. To build completely
offline from an already-unpacked snapshot:

```bash
python3 scripts/build_dictionary_packs.py --source /path/to/Multilingualism-main
```

The builder writes:

- `data/dictionary/meta.js`: language registry, concepts, categories, provenance
- `data/dictionary/packs/<code>.js`: one compact pack per language
- `data/dictionary/ATTRIBUTION.md`: attribution and change log
- `data/dictionary/SOURCE-LICENSE.txt`: upstream licence notice

Do not hand-edit generated files; change the builder and rebuild.

## JLPT Japanese deck

`Vocabulary.csv` remains the source of truth for the Japanese JLPT deck. Only
complete meaning-language columns are kept: English and Hindi. The incomplete
Telugu column was removed from both the CSV and the generated JS data. Hindi is
complete across all 6,283 rows, so it remains available. No runtime translation
is performed for this deck.

Rebuild the legacy JS data after editing the CSV:

```bash
python3 build_data.py
```

The old Google Translate helper and its model cache have been **removed**.
Do not reintroduce translation APIs for dictionary data.

### CSV columns

| Column | Description |
|--------|-------------|
| `n`    | Word number |
| `w`    | Kanji / word form |
| `r`    | Reading (kana) |
| `ro`   | Romaji |
| `m`    | English meaning |
| `h`    | Hindi meaning |
| `c`    | Category |
| `p`    | Part of speech |
| `lv`   | JLPT level (N5 to N1) |
| `em`   | Emoji |

## Project structure

```text
<repository root>/
├── index.html
├── css/styles.css                 # Legacy base layer
├── css/redesign.css               # Semantic design system layer
├── DESIGN.md                     # Design rules and measured contrast
├── js/
│   ├── config.js             # JLPT meaning-language registry + shared helpers
│   ├── state.js              # App state
│   ├── dictionary.js         # Local pack loader + concept-aligned card builder
│   ├── data.js               # Deck construction and filtering
│   ├── speech.js             # Browser-aware voice selection and playback
│   ├── ui.js                 # Cards, settings, fullscreen, autoplay
│   └── app.js                # Event wiring, saved settings, startup
├── data/
│   ├── vocabulary.js         # Generated JLPT Japanese data
│   └── dictionary/
│       ├── meta.js           # Generated dictionary metadata
│       ├── packs/*.js        # Generated per-language packs
│       ├── ATTRIBUTION.md
│       └── SOURCE-LICENSE.txt
├── scripts/
│   └── build_dictionary_packs.py
├── tests/
│   ├── test_dictionary_packs.py
│   └── dictionary_data.test.js
├── build_data.py             # Rebuilds data/vocabulary.js from the CSV
├── Vocabulary.csv            # JLPT Japanese source of truth
└── README.md
```

## Tests

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/dictionary_data.test.js
```

The tests verify that every language pack exists, every pair has shared
concepts, generated packs contain no AI-generated source markers, the
browser-side card builder produces valid two-language cards, all six accent
themes meet WCAG AA contrast, and the compact card, viewport fit, no bottom
player, and restored icon contracts hold.

## Tech

HTML, CSS, and vanilla JavaScript. Speech uses the Web Speech API. Python 3 is
used only to rebuild data from local dictionary snapshots or the CSV.
