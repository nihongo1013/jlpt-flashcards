# JLPT Flashcards

A Japanese vocabulary flashcard app covering JLPT N5–N1, with translations and text-to-speech.

## Features

- 6,280+ vocabulary cards across JLPT N5 → N1
- Translations: English, Hindi, Telugu (more languages can be added via the CSV)
- Text-to-speech for Japanese and for the chosen meaning language
- Voice picker that defaults to the best supported voice in the current browser
- Category and level filters, search, shuffle, fullscreen, and autoplay

## Project structure

```
jlpt-flashcards/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── config.js      # Language registry and shared constants
│   ├── state.js       # App state
│   ├── data.js        # Filtering and language field helpers
│   ├── speech.js      # Voice selection and playback
│   ├── ui.js          # Cards, settings, fullscreen, autoplay
│   └── app.js         # Event wiring and startup
├── data/
│   └── vocabulary.js  # Generated from Vocabulary.csv
├── scripts/
│   └── fill_telugu.py # Fills empty Telugu cells from Japanese
├── Vocabulary.csv     # Source of truth for every language
├── build_data.py      # Rebuilds data/vocabulary.js from the CSV
├── .gitignore
└── README.md
```

## Getting started

Open `index.html` in a modern browser, or serve the folder:

```bash
python3 -m http.server 8765
```

Then visit `http://127.0.0.1:8765/`.

## Updating vocabulary

`Vocabulary.csv` is the source of truth. Always add or fix translations in the CSV first.

```bash
python3 build_data.py
```

That regenerates `data/vocabulary.js`.

To fill empty Telugu cells from Japanese:

```bash
python3 scripts/fill_telugu.py
python3 build_data.py
```

## Adding a new language

1. Add a column to `Vocabulary.csv` (for example `ko` for Korean) and fill it.
2. Run `python3 build_data.py` (include the new field in `build_data.py`).
3. Register the language in `js/config.js`:

```javascript
ko: { label: "한국어", langCode: "ko-KR", field: "ko", textClass: "ko-t", icon: "🇰🇷" },
```

4. Add the option in Settings in `index.html`.
5. Add a CSS class for the meaning text.

Default meaning language is English. After a language is chosen, the meaning-voice dropdown lists voices for that language and selects the best one the browser reports.

## CSV columns

| Column | Description |
|--------|-------------|
| `n`    | Word number |
| `w`    | Kanji / word form |
| `r`    | Reading (kana) |
| `ro`   | Romaji |
| `m`    | English meaning |
| `h`    | Hindi meaning |
| `te`   | Telugu meaning |
| `c`    | Category |
| `p`    | Part of speech |
| `lv`   | JLPT level (N5–N1) |
| `em`   | Emoji |

## Tech

HTML, CSS, and vanilla JavaScript. Speech uses the Web Speech API. Python 3 is used only to rebuild data from the CSV.
