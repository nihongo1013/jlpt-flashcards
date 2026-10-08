#!/usr/bin/env python3
"""
Build script: Converts Vocabulary.csv into data/vocabulary.js
This generates the JSON data grouped by JLPT level for the flashcard app.
Run this script whenever the CSV is updated.
"""

import csv
import json
import os

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Vocabulary.csv")
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
OUT_PATH = os.path.join(OUT_DIR, "vocabulary.js")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # Read CSV
    rows = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    print(f"Read {len(rows)} rows from CSV")

    # Group by JLPT level
    levels = {"n5": [], "n4": [], "n3": [], "n2": [], "n1": []}

    for row in rows:
        lv = (row.get("lv", "") or "").strip().upper()
        key = lv.lower() if lv in ("N5", "N4", "N3", "N2", "N1") else None
        if not key:
            continue

        item = {
            "n": int(row.get("n", 0)),
            "w": row.get("w", ""),
            "r": row.get("r", ""),
            "ro": row.get("ro", ""),
            "m": row.get("m", ""),
            "h": row.get("h", ""),
            "te": row.get("te", ""),
            "c": row.get("c", ""),
            "p": row.get("p", ""),
            "lv": lv,
            "em": row.get("em", ""),
        }
        levels[key].append(item)

    counts = {k: len(v) for k, v in levels.items()}
    print(f"Level counts: {counts}")
    print(f"Total: {sum(counts.values())}")

    # Write as JS module
    json_str = json.dumps(levels, ensure_ascii=False, separators=(",", ":"))
    js_content = f"// Auto-generated from Vocabulary.csv — do not edit manually\n// Generated: {__import__('datetime').datetime.now().isoformat()}\nconst DATA = {json_str};\n"

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(js_content)

    size_kb = os.path.getsize(OUT_PATH) / 1024
    print(f"Written {OUT_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
