"""Integrity checks for the generated, API-free dictionary packs."""

import csv
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DICT_DIR = ROOT / "data" / "dictionary"
META_PATH = DICT_DIR / "meta.js"


def load_meta():
    text = META_PATH.read_text(encoding="utf-8")
    marker = "window.DICTIONARY_META = "
    if marker not in text:
        raise AssertionError("meta.js does not contain DICTIONARY_META")
    payload = text.split(marker, 1)[1].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


class DictionaryPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.meta = load_meta()

    def test_metadata_declares_human_edited_only_source(self):
        source = self.meta["source"]
        self.assertTrue(source["humanEditedOnly"])
        self.assertEqual(source["license"], "CC BY-SA 4.0")
        self.assertIn("ai", source["policy"])
        self.assertGreater(self.meta["stats"]["excludedMachineTranslations"], 0)
        self.assertEqual(self.meta["stats"]["languages"], 109)
        self.assertEqual(self.meta["stats"]["concepts"], 9852)
        self.assertEqual(self.meta["stats"]["languagePairs"], 5886)
        self.assertGreaterEqual(self.meta["stats"]["minPairCards"], 1)

    def test_every_pack_exists_and_has_no_generated_markers(self):
        self.assertEqual(len(self.meta["packs"]), self.meta["stats"]["languages"])
        for code, info in self.meta["packs"].items():
            path = DICT_DIR / info["path"]
            self.assertTrue(path.is_file(), f"missing pack for {code}: {path}")
            text = path.read_text(encoding="utf-8")
            self.assertIn("window.DICTIONARY_PACKS", text)
            self.assertNotIn('"src":"ai"', text, f"AI translation leaked into {code}")
            self.assertNotIn('"low":1', text, f"low-confidence entry leaked into {code}")

    def test_source_files_contain_no_translation_endpoint(self):
        # Built from pieces so this negative test is not itself a hit for a
        # repository-wide endpoint scan.
        endpoint = "translate." + "googleapis." + "com"
        path = "translate_a/" + "single"
        forbidden = re.compile(
            "|".join([re.escape(endpoint), re.escape(path), r"/translate\?", r"fill_telugu\.py"]),
            re.IGNORECASE,
        )
        candidates = [ROOT / "README.md", ROOT / "index.html", ROOT / "build_data.py"]
        candidates += sorted((ROOT / "js").glob("*.js"))
        candidates += sorted((ROOT / "scripts").glob("*.py"))
        for path in candidates:
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8")
            self.assertIsNone(forbidden.search(text), f"translation endpoint reference in {path}")

    def test_builder_explicitly_filters_generated_entries(self):
        source = (ROOT / "scripts" / "build_dictionary_packs.py").read_text(encoding="utf-8")
        self.assertIn('item.get("src") == "ai"', source)
        self.assertIn('item.get("low")', source)
        self.assertIn("codeload.github.com", source)

    def test_legacy_translation_helper_is_gone(self):
        self.assertFalse((ROOT / "scripts" / "fill_telugu.py").exists())
        self.assertFalse((ROOT / ".hf-cache").exists())

    def test_attribution_and_license_notice_are_present(self):
        attribution = (DICT_DIR / "ATTRIBUTION.md").read_text(encoding="utf-8")
        self.assertIn("CC BY-SA 4.0", attribution)
        self.assertIn("excluded", attribution.lower())
        self.assertTrue((DICT_DIR / "SOURCE-LICENSE.txt").is_file())

    def test_project_name_matches_multilingual_version(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertTrue(readme.startswith("# Lingua Pairs"))
        self.assertIn("<title>Lingua Pairs", index)
        self.assertIn('class="brand-name">Lingua Pairs', index)
        self.assertNotIn("JLPT Flashcards", index)
        self.assertIn("Popular international languages", readme)

    def test_every_popular_quick_pick_has_a_dictionary_pack(self):
        config = (ROOT / "js" / "config.js").read_text(encoding="utf-8")
        match = re.search(r"const POPULAR_LANGUAGE_CODES = \[(.*?)\];", config, re.S)
        self.assertIsNotNone(match)
        codes = re.findall(r'"([^"]+)"', match.group(1))
        self.assertGreaterEqual(len(codes), 60)
        self.assertEqual(len(codes), len(set(codes)))
        supported = {item["code"] for item in self.meta["languages"]}
        self.assertEqual(set(codes) - supported, set())

    def test_design_doctrine_is_documented(self):
        design = (ROOT / "DESIGN.md").read_text(encoding="utf-8")
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("Operate", design)
        self.assertIn("WCAG", design)
        self.assertIn("open a PR to `main`", readme)
        self.assertIn("www.ui-skills.com", design)
        self.assertIn("agenticskills.io/category/design", design)
        self.assertIn("plugin87/ux-ui-agent-skills", design)

    def test_frontend_uses_the_design_layer_without_decorative_glyphs(self):
        files = [
            ROOT / "index.html",
            ROOT / "css" / "redesign.css",
            ROOT / "css" / "styles.css",
            ROOT / "DESIGN.md",
        ]
        files += sorted((ROOT / "js").glob("*.js"))
        emoji = re.compile(
            "[\U0001F000-\U0001FAFF\U00002600-\U000026FF"
            "\U00002700-\U000027BF\U00002B00-\U00002BFF]"
        )
        for path in files:
            text = path.read_text(encoding="utf-8")
            self.assertIsNone(emoji.search(text), f"decorative glyph in {path}")
            self.assertNotIn("\u2014", text, f"em dash in {path}")
            self.assertNotIn("\u2013", text, f"en dash in {path}")
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        css = (ROOT / "css" / "redesign.css").read_text(encoding="utf-8")
        ui = (ROOT / "js" / "ui.js").read_text(encoding="utf-8")
        app = (ROOT / "js" / "app.js").read_text(encoding="utf-8")
        self.assertIn("css/redesign.css", html)
        self.assertIn("--surface-page", css)
        self.assertIn("--font-display", css)
        self.assertIn("prefers-reduced-motion: reduce", css)
        self.assertIn("prefers-color-scheme: dark", css)
        self.assertIn("card-meta", ui)
        self.assertIn("card-index", ui)
        self.assertIn("side-head", ui)
        self.assertNotIn("startSakura", app)
        self.assertNotIn("createSakuraPetal", ui)

    def test_design_token_pairs_meet_wcag_aa_contrast(self):
        def luminance(hex_color):
            value = hex_color.lstrip("#")
            channels = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
            def linear(channel):
                return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4
            red, green, blue = map(linear, channels)
            return 0.2126 * red + 0.7152 * green + 0.0722 * blue

        def ratio(foreground, background):
            first, second = luminance(foreground), luminance(background)
            high, low = max(first, second), min(first, second)
            return (high + 0.05) / (low + 0.05)

        pairs = [
            ("#211D24", "#F4F1E8"),
            ("#5C5660", "#F4F1E8"),
            ("#211D24", "#FBF9F2"),
            ("#2F5D50", "#F4F1E8"),
            ("#F4F1E8", "#2F5D50"),
            ("#211D24", "#D8E84A"),
            ("#5C5660", "#D8E84A"),
            ("#F4F1E8", "#17151A"),
            ("#B9B2A9", "#17151A"),
            ("#F4F1E8", "#211E25"),
            ("#8FD3B6", "#17151A"),
            ("#17151A", "#8FD3B6"),
            ("#F4F1E8", "#35481C"),
            ("#B9B2A9", "#35481C"),
        ]
        for foreground, background in pairs:
            self.assertGreaterEqual(
                ratio(foreground, background), 4.5,
                f"contrast failure for {foreground} on {background}",
            )

    def test_csv_keeps_only_complete_meaning_columns(self):
        with (ROOT / "Vocabulary.csv").open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            rows = list(reader)
            fields = reader.fieldnames
        self.assertIsNotNone(fields)
        self.assertNotIn("te", fields)
        self.assertEqual(len(rows), 6283)
        self.assertFalse(any(not (row.get("h") or "").strip() for row in rows))
        self.assertFalse(re.search(r'"te":', (ROOT / "data" / "vocabulary.js").read_text(encoding="utf-8")))
        config = (ROOT / "js" / "config.js").read_text(encoding="utf-8")
        self.assertNotRegex(config, r'^\s*te:\s*\{', re.MULTILINE)
        self.assertNotIn('row.get("te"', (ROOT / "build_data.py").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
