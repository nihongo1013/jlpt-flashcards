"""Integrity checks for the generated, API-free dictionary packs."""

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


if __name__ == "__main__":
    unittest.main()
