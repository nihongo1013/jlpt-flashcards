#!/usr/bin/env python3
"""Fill empty Telugu (te) cells in Vocabulary.csv by translating Japanese."""

import csv
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT, "Vocabulary.csv")
CACHE_PATH = os.path.join(ROOT, "scripts", ".telugu_cache.json")
RETRIES = 8
DELAY = 0.25
FIELDNAMES = ["n", "w", "r", "ro", "m", "h", "te", "c", "p", "lv", "em"]


def log(msg):
    print(msg, flush=True)


def load_cache():
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    tmp = CACHE_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)
    os.replace(tmp, CACHE_PATH)


def translate_ja_to_te(text):
    url = (
        "https://translate.googleapis.com/translate_a/single"
        "?client=gtx&sl=ja&tl=te&dt=t&q=" + urllib.parse.quote(text)
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    last_err = None
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            parts = [seg[0] for seg in data[0] if seg and seg[0]]
            return "".join(parts).strip()
        except Exception as err:
            last_err = err
            wait = 2.5 * (attempt + 1)
            if "429" in str(err):
                wait = 8 * (attempt + 1)
            time.sleep(wait)
    raise RuntimeError(f"translate failed for {text!r}: {last_err}")


def write_csv(rows):
    tmp_csv = CSV_PATH + ".tmp"
    with open(tmp_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    os.replace(tmp_csv, CSV_PATH)


def apply_cache(rows, cache):
    filled = 0
    still_empty = 0
    for row in rows:
        if (row.get("te") or "").strip():
            continue
        src = (row.get("w") or "").strip() or (row.get("r") or "").strip()
        te = (cache.get(src) or "").strip()
        if te:
            row["te"] = te
            filled += 1
        else:
            still_empty += 1
    return filled, still_empty


def main():
    cache = load_cache()
    with open(CSV_PATH, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))

    unique = []
    seen = set()
    for row in rows:
        if (row.get("te") or "").strip():
            continue
        src = (row.get("w") or "").strip() or (row.get("r") or "").strip()
        if not src or src in cache or src in seen:
            continue
        seen.add(src)
        unique.append(src)

    log(f"Rows: {len(rows)}")
    log(f"Cache already has: {len(cache)}")
    log(f"Unique Japanese strings still needing Telugu: {len(unique)}")

    for i, src in enumerate(unique, 1):
        try:
            cache[src] = translate_ja_to_te(src)
        except Exception as err:
            log(f"FAIL {src}: {err}")
            time.sleep(8)
            continue
        if i % 25 == 0:
            save_cache(cache)
            log(f"translated {i}/{len(unique)}")
        time.sleep(DELAY)

    save_cache(cache)
    filled, still_empty = apply_cache(rows, cache)
    write_csv(rows)
    log(f"Wrote {CSV_PATH}: filled {filled}, still empty {still_empty}")


if __name__ == "__main__":
    main()
