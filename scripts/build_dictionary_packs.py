#!/usr/bin/env python3
"""Build offline flashcard packs from human-edited Wiktionary dictionary senses.

The input is a pinned snapshot of MethodoxTech/Multilingualism, which is a
structured extract of English Wiktionary translation tables (via Wiktextract /
kaikki.org). That snapshot also contains AI-generated translations to fill
coverage gaps. THIS BUILDER EXCLUDES EVERY ENTRY MARKED AS AI-GENERATED. No
translation API or translation model is used here or by the web app.

Each output pack maps a Wiktionary concept (one headword + primary sense) to
dictionary-attested terms in one language. At runtime the app intersects the
two selected packs; a card is shown only when BOTH languages have a real
dictionary entry for the same sense. English headwords are dictionary entries,
not translations produced by this project.

Usage:
    python3 scripts/build_dictionary_packs.py
    python3 scripts/build_dictionary_packs.py --source /path/to/unpacked/snapshot

The default command downloads the pinned source snapshot from codeload.github.com.
Raw source files are kept outside the repository; only compact, generated packs
needed by the static site are written to data/dictionary/.
"""

from __future__ import annotations

import argparse
import io
import json
import shutil
import tarfile
import urllib.request
from collections import defaultdict
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "dictionary"
PACK_DIR = OUT_DIR / "packs"

SOURCE_REPO = "MethodoxTech/Multilingualism"
SOURCE_COMMIT = "fe427837f392a90f8d68a3e69c7c9f3c1f716bb9"
SOURCE_TARBALL = (
    "https://codeload.github.com/"
    f"{SOURCE_REPO}/tar.gz/{SOURCE_COMMIT}"
)

# Best-effort BCP-47 tags for Web Speech. A browser may not have a voice for a
# language, but the tag lets it choose correctly when one is available. Codes
# not listed here fall back to their ISO/macrolanguage code.
LOCALES = {
    "en": "en-US", "af": "af-ZA", "sq": "sq-AL", "am": "am-ET", "ar": "ar-SA",
    "hy": "hy-AM", "az": "az-AZ", "eu": "eu-ES", "be": "be-BY", "bn": "bn-IN",
    "bs": "bs-BA", "bg": "bg-BG", "ca": "ca-ES", "ceb": "ceb-PH", "ny": "ny-MW",
    "zh-Hans": "zh-CN", "zh-Hant": "zh-TW", "co": "co-FR", "hr": "hr-HR",
    "cs": "cs-CZ", "da": "da-DK", "nl": "nl-NL", "eo": "eo", "et": "et-EE",
    "fil": "fil-PH", "fi": "fi-FI", "fr": "fr-FR", "fy": "fy-NL", "gl": "gl-ES",
    "ka": "ka-GE", "de": "de-DE", "el": "el-GR", "gu": "gu-IN", "ht": "ht-HT",
    "ha": "ha-NG", "haw": "haw-US", "he": "he-IL", "hi": "hi-IN", "hmn": "hmn",
    "hu": "hu-HU", "is": "is-IS", "ig": "ig-NG", "id": "id-ID", "ga": "ga-IE",
    "it": "it-IT", "ja": "ja-JP", "jv": "jv-ID", "kn": "kn-IN", "kk": "kk-KZ",
    "km": "km-KH", "rw": "rw-RW", "ko": "ko-KR", "kmr": "ku-TR", "ky": "ky-KG",
    "lo": "lo-LA", "la": "la", "lv": "lv-LV", "lt": "lt-LT", "lb": "lb-LU",
    "mk": "mk-MK", "mg": "mg-MG", "ms": "ms-MY", "ml": "ml-IN", "mt": "mt-MT",
    "mi": "mi-NZ", "mr": "mr-IN", "mn": "mn-MN", "my": "my-MM", "ne": "ne-NP",
    "no": "no-NO", "or": "or-IN", "ps": "ps-AF", "fa": "fa-IR", "pl": "pl-PL",
    "pt": "pt-PT", "pa": "pa-IN", "ro": "ro-RO", "ru": "ru-RU", "sm": "sm-WS",
    "gd": "gd-GB", "sr": "sr-RS", "st": "st-ZA", "sn": "sn-ZW", "sd": "sd-PK",
    "si": "si-LK", "sk": "sk-SK", "sl": "sl-SI", "so": "so-SO", "es": "es-ES",
    "su": "su-ID", "sw": "sw-KE", "sv": "sv-SE", "tg": "tg-TJ", "ta": "ta-IN",
    "tt": "tt-RU", "te": "te-IN", "th": "th-TH", "tr": "tr-TR", "tk": "tk-TM",
    "uk": "uk-UA", "ur": "ur-PK", "ug": "ug-CN", "uz": "uz-UZ", "vi": "vi-VN",
    "cy": "cy-GB", "xh": "xh-ZA", "yi": "yi", "yo": "yo-NG", "zu": "zu-ZA",
}

GENDER_LABELS = {
    "m": "masculine", "f": "feminine", "n": "neuter", "c": "common",
    "mf": "masculine / feminine", "mn": "masculine / neuter",
    "fn": "feminine / neuter", "fc": "feminine / common",
    "nc": "neuter / common", "mfn": "masculine / feminine / neuter",
    "mc": "masculine / common", "mfc": "masculine / feminine / common",
}

CONCEPT_FIELDS = ["slug", "word", "pos", "category", "gloss", "definition", "sourceUrl"]
TERM_FIELDS = ["w", "r", "k", "g"]


def log(message: str) -> None:
    print(message, flush=True)


def compact_json(value: object) -> str:
    """JSON that is safe inside a standalone .js file."""
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return text.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def download_source(destination: Path) -> Path:
    """Download and safely extract the pinned GitHub source snapshot."""
    log(f"Downloading pinned dictionary source {SOURCE_COMMIT[:12]}…")
    request = urllib.request.Request(
        SOURCE_TARBALL, headers={"User-Agent": "lingua-pairs-dictionary-builder"}
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        payload = response.read()
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as archive:
        for member in archive.getmembers():
            name = Path(member.name)
            if name.is_absolute() or ".." in name.parts or not member.isfile():
                continue
            target = destination / name
            target.parent.mkdir(parents=True, exist_ok=True)
            source = archive.extractfile(member)
            if source is not None:
                with source, open(target, "wb") as handle:
                    shutil.copyfileobj(source, handle)
    words_dirs = list(destination.rglob("data/words"))
    if not words_dirs:
        raise RuntimeError("Source snapshot does not contain data/words")
    return words_dirs[0].parent.parent


def resolve_source(args: argparse.Namespace) -> tuple[Path, str]:
    if args.source:
        source = Path(args.source).resolve()
        if not (source / "data" / "words").is_dir():
            raise SystemExit(f"--source must contain data/words: {source}")
        return source, args.commit
    cache = Path(args.cache).resolve()
    snapshot = cache / f"{SOURCE_REPO.split('/')[-1]}-{SOURCE_COMMIT[:12]}"
    marker = snapshot / ".dictionary-source-ok"
    if marker.exists() and (snapshot / "data" / "words").is_dir():
        return snapshot, args.commit
    if cache.exists():
        shutil.rmtree(cache)
    source = download_source(cache)
    marker.parent.mkdir(parents=True, exist_ok=True)
    marker.write_text(SOURCE_COMMIT, encoding="utf-8")
    return source, args.commit


def clean_text(value: object, limit: int | None = None) -> str:
    text = " ".join(str(value or "").split())
    if limit and len(text) > limit:
        text = text[: limit - 1].rstrip() + "…"
    return text


def term_array(item: dict) -> list[str] | None:
    """Keep only human-edited Wiktionary translations.

    The upstream data marks generated gap-fills with src="ai". Some also have
    low=1. Both are rejected defensively so a future source update cannot
    silently reintroduce machine translations.
    """
    if item.get("src") == "ai" or item.get("low"):
        return None
    word = clean_text(item.get("w"))
    if not word or not any(char.isalnum() for char in word):
        return None
    values = [
        word,
        clean_text(item.get("r")),
        clean_text(item.get("k")),
        clean_text(item.get("g")),
    ]
    while values and not values[-1]:
        values.pop()
    return values


def source_url(word: str) -> str:
    from urllib.parse import quote

    return "https://en.wiktionary.org/wiki/" + quote(word.replace(" ", "_"), safe="/_()")


def read_snapshot(source: Path):
    index_path = source / "data" / "index.json"
    meta_path = source / "data" / "meta.json"
    words_dir = source / "data" / "words"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    upstream_meta = json.loads(meta_path.read_text(encoding="utf-8"))
    if index.get("columns") != ["slug", "word", "pos", "category", "languages"]:
        raise RuntimeError("Unexpected source index.json schema")
    rows = index["rows"]
    concept_index = {row[0]: i for i, row in enumerate(rows)}
    return rows, concept_index, upstream_meta, words_dir


def build_concepts(rows, words_dir: Path):
    concepts = []
    for slug, word, pos, category, _coverage in rows:
        path = words_dir / f"{slug}.json"
        doc = json.loads(path.read_text(encoding="utf-8"))
        definitions = [clean_text(d) for d in doc.get("definitions", []) if clean_text(d)]
        concepts.append([
            slug,
            clean_text(word),
            clean_text(pos),
            clean_text(category),
            clean_text(doc.get("gloss")),
            clean_text(definitions[0] if definitions else "", 260),
            source_url(clean_text(word)),
        ])
    return concepts


def build_packs(rows, concept_index, words_dir: Path):
    packs = defaultdict(dict)
    machine_count = 0
    low_count = 0
    for path in sorted(words_dir.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        slug = doc.get("slug")
        if slug not in concept_index:
            continue
        idx = concept_index[slug]
        for code, translations in doc.get("translations", {}).items():
            for item in translations:
                if item.get("src") == "ai":
                    machine_count += 1
                if item.get("low"):
                    low_count += 1
            terms = [term_array(item) for item in translations]
            terms = [term for term in terms if term]
            if terms:
                packs[code][idx] = terms
        # English headwords are authentic dictionary entries from index.json.
        packs["en"][idx] = [[rows[idx][1]]]
    return packs, machine_count, low_count


def language_records(upstream_meta: dict, packs: dict, concepts: list) -> list[dict]:
    by_code = {item["code"]: item for item in upstream_meta["languages"]}
    records = [{
        "code": "en",
        "name": "English",
        "native": "English",
        "region": "european",
        "rtl": False,
        "locale": LOCALES["en"],
        "concepts": len(packs["en"]),
        "terms": len(packs["en"]),
    }]
    for item in upstream_meta["languages"]:
        code = item["code"]
        entries = packs.get(code, {})
        records.append({
            "code": code,
            "name": clean_text(item.get("name")),
            "native": clean_text(item.get("native")),
            "region": clean_text(item.get("region"), 40) or "other",
            "rtl": bool(item.get("rtl")),
            "locale": LOCALES.get(code, code),
            "concepts": len(entries),
            "terms": sum(len(terms) for terms in entries.values()),
        })
    # Keep a stable, readable order in the UI: English first, then A–Z.
    records.sort(key=lambda item: (item["code"] != "en", item["name"].casefold()))
    assert len(records) == len(by_code) + 1
    assert len(concepts) == len(packs["en"])
    return records


def pair_stats(packs: dict) -> tuple[int, int, list[str]]:
    """Verify every unordered language pair has at least one shared concept."""
    concept_sets = {code: set(entries) for code, entries in packs.items()}
    minimum = None
    min_pair = []
    total = 0
    codes = sorted(concept_sets)
    for left, right in combinations(codes, 2):
        count = len(concept_sets[left] & concept_sets[right])
        total += 1
        if minimum is None or count < minimum:
            minimum, min_pair = count, [left, right]
        if count == 0:
            raise RuntimeError(f"No shared dictionary senses for {left} ↔ {right}")
    return total, minimum or 0, min_pair


def write_outputs(source: Path, commit: str, upstream_meta: dict, concepts: list,
                  languages: list, packs: dict, stats: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if PACK_DIR.exists():
        shutil.rmtree(PACK_DIR)
    PACK_DIR.mkdir(parents=True)

    pack_manifest = {}
    for code, entries in sorted(packs.items()):
        filename = f"{code}.js"
        pack_manifest[code] = {
            "path": f"packs/{filename}",
            "concepts": len(entries),
            "terms": sum(len(terms) for terms in entries.values()),
        }
        payload = [[idx, terms] for idx, terms in sorted(entries.items())]
        content = (
            "// Human-edited Wiktionary senses only — generated by scripts/build_dictionary_packs.py\n"
            "// Source: https://github.com/MethodoxTech/Multilingualism/tree/" + commit + "\n"
            "// Derived data: CC BY-SA 4.0. See ../ATTRIBUTION.md\n"
            "window.DICTIONARY_PACKS = window.DICTIONARY_PACKS || {};\n"
            f"window.DICTIONARY_PACKS[{compact_json(code)}] = "
            f"{{\"code\":{compact_json(code)},\"entries\":{compact_json(payload)}}};\n"
        )
        (PACK_DIR / filename).write_text(content, encoding="utf-8")

    categories = [
        {"id": clean_text(item["id"]), "label": clean_text(item["name"])}
        for item in upstream_meta.get("categories", [])
    ]
    regions = [
        {"id": clean_text(item["id"]), "label": clean_text(item["name"])}
        for item in upstream_meta.get("regions", [])
    ]
    meta = {
        "schema": 1,
        "conceptFields": CONCEPT_FIELDS,
        "termFields": TERM_FIELDS,
        "genderLabels": GENDER_LABELS,
        "source": {
            "name": "English Wiktionary translation tables",
            "extract": "Wiktextract / kaikki.org via MethodoxTech/Multilingualism",
            "repository": f"https://github.com/{SOURCE_REPO}",
            "commit": commit,
            "version": clean_text(upstream_meta.get("version")),
            "license": "CC BY-SA 4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
            "humanEditedOnly": True,
            "policy": "Primary Wiktionary sense only; all src=ai and low-confidence gap-fills excluded.",
            "attribution": "data/dictionary/ATTRIBUTION.md",
        },
        "languages": languages,
        "regions": regions,
        "categories": categories,
        "concepts": concepts,
        "packs": pack_manifest,
        "stats": stats,
    }
    meta_js = (
        "// Human-edited dictionary metadata — generated by scripts/build_dictionary_packs.py\n"
        "window.DICTIONARY_PACKS = window.DICTIONARY_PACKS || {};\n"
        f"window.DICTIONARY_META = {compact_json(meta)};\n"
    )
    (OUT_DIR / "meta.js").write_text(meta_js, encoding="utf-8")

    source_license = source / "LICENSE"
    if source_license.is_file():
        shutil.copyfile(source_license, OUT_DIR / "SOURCE-LICENSE.txt")

    attribution = f"""# Dictionary data attribution

The files in `data/dictionary/` are a derived, compact build of human-edited
dictionary entries from the **English Wiktionary**. The structured extract was
produced by [Wiktextract / kaikki.org](https://kaikki.org/dictionary/English/)
and packaged in [MethodoxTech/Multilingualism](https://github.com/{SOURCE_REPO})
at pinned commit `{commit}` (dataset version {clean_text(upstream_meta.get("version"))}).

## What this project changed

- Kept only the primary Wiktionary sense for each English headword.
- Excluded **every** upstream translation marked `src: "ai"` or low-confidence.
  All {stats['excludedMachineTranslations']:,} generated gap-fills were discarded.
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

- {stats['languages']:,} languages (including English)
- {stats['concepts']:,} Wiktionary concepts
- {stats['humanEditedEntries']:,} concept/language attestations
- {stats['humanEditedTerms']:,} human-edited terms
- {stats['languagePairs']:,} language pairs, all with at least
  {stats['minPairCards']:,} shared cards (smallest pair: `{stats['minPair'][0]}` ↔ `{stats['minPair'][1]}`)

## Licence

The derived data is licensed under **Creative Commons Attribution-ShareAlike
4.0 International (CC BY-SA 4.0)**. See `SOURCE-LICENSE.txt` for the upstream
licence notice and the [licence text](https://creativecommons.org/licenses/by-sa/4.0/).

Attribution: English Wiktionary contributors; Tatu Ylonen, *Wiktextract:
Wiktionary as Machine-Readable Structured Data* (LREC 2022); Charles Zhang /
MethodoxTech for the structured snapshot; Princeton WordNet 3.0 for category
grouping; wordfreq for frequency ordering. Changes are described above.
"""
    (OUT_DIR / "ATTRIBUTION.md").write_text(attribution, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", help="Path to an unpacked source snapshot")
    parser.add_argument("--commit", default=SOURCE_COMMIT, help="Source commit recorded in metadata")
    parser.add_argument(
        "--cache",
        default=str(ROOT / ".cache" / "dictionary-source"),
        help="Where to keep the downloaded raw source snapshot",
    )
    args = parser.parse_args()

    source, commit = resolve_source(args)
    rows, concept_index, upstream_meta, words_dir = read_snapshot(source)
    log(f"Reading {len(rows):,} Wiktionary concepts from {source}")
    concepts = build_concepts(rows, words_dir)
    packs, machine_count, low_count = build_packs(rows, concept_index, words_dir)
    # term_array() is the only way data enters a pack; it rejects src="ai"
    # and low=1 before a term can be serialized.
    pair_count, min_cards, min_pair = pair_stats(packs)
    stats = {
        "languages": len(packs),
        "concepts": len(concepts),
        "humanEditedEntries": sum(len(entries) for entries in packs.values()),
        "humanEditedTerms": sum(
            len(terms) for entries in packs.values() for terms in entries.values()
        ),
        "excludedMachineTranslations": machine_count,
        "excludedLowConfidence": low_count,
        "languagePairs": pair_count,
        "minPairCards": min_cards,
        "minPair": min_pair,
    }
    languages = language_records(upstream_meta, packs, concepts)
    write_outputs(source, commit, upstream_meta, concepts, languages, packs, stats)

    total_bytes = sum(path.stat().st_size for path in OUT_DIR.rglob("*") if path.is_file())
    log(f"Excluded {machine_count:,} AI-generated translations and {low_count:,} low-confidence entries")
    log(f"Wrote {len(packs)} packs, {stats['humanEditedTerms']:,} human-edited terms")
    log(f"All {pair_count:,} language pairs have cards; smallest: {min_pair[0]}↔{min_pair[1]} ({min_cards})")
    log(f"Output: {OUT_DIR} ({total_bytes / 1024 / 1024:.1f} MiB)")


if __name__ == "__main__":
    main()
