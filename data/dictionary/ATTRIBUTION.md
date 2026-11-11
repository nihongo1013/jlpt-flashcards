# Dictionary data attribution

The files in `data/dictionary/` are a derived, compact build of human-edited
dictionary entries from the **English Wiktionary**. The structured extract was
produced by [Wiktextract / kaikki.org](https://kaikki.org/dictionary/English/)
and packaged in [MethodoxTech/Multilingualism](https://github.com/MethodoxTech/Multilingualism)
at pinned commit `fe427837f392a90f8d68a3e69c7c9f3c1f716bb9` (dataset version 2026-10-22).

## What this project changed

- Kept only the primary Wiktionary sense for each English headword.
- Excluded **every** upstream translation marked `src: "ai"` or low-confidence.
  All 544,786 generated gap-fills were discarded.
- Kept human-edited translations, romanizations, kana readings, and grammatical
  gender tags where the dictionary supplied them.
- Added best-effort BCP-47 speech tags and converted the data into per-language
  JavaScript packs so the static app can load exactly two languages offline.
- Used Wiktionary's English headword as a concept identifier and as the `en`
  pack. Cards are intersections of two already-attested dictionary senses; the
  app does **not** translate between them.

No translation API, translation model, or runtime network request is used to
create cards. Selecting a language pair loads two local files and intersects
their concept IDs.

## Coverage

- 109 languages (including English)
- 9,852 Wiktionary concepts
- 529,078 concept/language attestations
- 780,518 human-edited terms
- 5,886 language pairs, all with at least
  65 shared cards (smallest pair: `hmn` ↔ `rw`)

## Licence

The derived data is licensed under **Creative Commons Attribution-ShareAlike
4.0 International (CC BY-SA 4.0)**. See `SOURCE-LICENSE.txt` for the upstream
licence notice and the [licence text](https://creativecommons.org/licenses/by-sa/4.0/).

Attribution: English Wiktionary contributors; Tatu Ylonen, *Wiktextract:
Wiktionary as Machine-Readable Structured Data* (LREC 2022); Charles Zhang /
MethodoxTech for the structured snapshot; Princeton WordNet 3.0 for category
grouping; wordfreq for frequency ordering. Changes are described above.
