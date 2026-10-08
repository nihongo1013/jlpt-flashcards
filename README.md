# 🌸 NIHONGO 1013 — JLPT Flashcards

> **Learn Japanese • Speak Japanese • Enjoy Japanese**

A beautiful, interactive Japanese vocabulary flashcard application covering all JLPT levels (N5–N1) with **6,280+ words**, multi-language translations, and text-to-speech support.

---

## ✨ Features

- **6,280+ vocabulary cards** across JLPT N5 → N1
- **Multi-language translations** — English 🇬🇧, Hindi 🇮🇳, Telugu 🇮🇳 (more coming!)
- **Text-to-Speech** — Listen to Japanese pronunciation and meaning in your chosen language
- **Smart voice selection** — Auto-picks the best browser voice; manual override available
- **Category & level filters** — Focus on specific word types or JLPT levels
- **Search** — Instantly search across all fields (kanji, kana, romaji, meaning)
- **Fullscreen mode** — Immersive card-by-card study with keyboard navigation
- **Autoplay** — Hands-free sequential card playback with pronunciation
- **Shuffle mode** — Randomize card order for varied practice
- **Responsive design** — Works beautifully on desktop, tablet, and mobile
- **Dark mode** — Automatic dark theme based on system preference
- **Sakura petal animations** — Aesthetic Japanese-themed UI ✿

---

## 📁 Project Structure

```
jlpt-flashcards/
├── index.html          # Main HTML shell
├── css/
│   └── styles.css      # All styles (design system, responsive, dark mode)
├── js/
│   └── app.js          # Application logic (rendering, speech, filtering)
├── data/
│   └── vocabulary.js   # Auto-generated vocabulary data (from CSV)
├── Vocabulary.csv       # Source vocabulary data (6,280+ rows)
├── build_data.py       # Script to rebuild data/vocabulary.js from CSV
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Quick Start
Simply open `index.html` in any modern browser — no build step or server required!

```bash
# Clone the repo
git clone <your-repo-url>
cd jlpt-flashcards

# Open in browser
open index.html    # macOS
xdg-open index.html  # Linux
start index.html   # Windows
```

### Updating Vocabulary Data

The vocabulary source of truth is `Vocabulary.csv`. When you update the CSV (add words, add languages, fix translations):

```bash
python3 build_data.py
```

This regenerates `data/vocabulary.js` from the CSV.

---

## 🌐 Adding a New Language

1. **Update the CSV** — Add a new column to `Vocabulary.csv` (e.g., `ko` for Korean)
2. **Rebuild data** — Run `python3 build_data.py` (update it to include the new field)
3. **Register the language** in `js/app.js`:
   ```javascript
   const LANGUAGES = {
     // ... existing languages ...
     ko: { label: "한국어", langCode: "ko-KR", field: "ko", textClass: "ko-t", voiceSelectId: "meaningVoice", icon: "🇰🇷" },
   };
   ```
4. **Add a CSS class** for the new language text in `css/styles.css`:
   ```css
   .ko-t { font-size: clamp(22px,3.5vw,34px); font-weight: 700; color: #1565C0; ... }
   ```
5. **Add the option** in `index.html` settings:
   ```html
   <option value="ko">🇰🇷 한국어 (Korean)</option>
   ```

---

## 📊 CSV Format

| Column | Description |
|--------|-------------|
| `n`    | Word number (unique ID) |
| `w`    | Kanji / word form |
| `r`    | Reading (kana) |
| `ro`   | Romaji |
| `m`    | English meaning |
| `h`    | Hindi meaning (हिंदी) |
| `te`   | Telugu meaning (తెలుగు) |
| `c`    | Category |
| `p`    | Part of speech |
| `lv`   | JLPT Level (N5–N1) |
| `em`   | Emoji |

---

## 🎨 Design

- **Japanese-inspired aesthetic** with sakura (🌸) themed colors
- **Premium card design** with gradient accents and hover animations
- **NIHONGO 1013 brand** with brand-red (#C62828) and sakura-pink (#F7B7C8)
- **Automatic dark mode** with a night-themed palette
- **Fully responsive** — optimized for 480px, 700px, and desktop breakpoints

---

## 🛠 Tech Stack

- **HTML5** + **CSS3** (vanilla, no frameworks)
- **Vanilla JavaScript** (no dependencies)
- **Web Speech API** for text-to-speech
- **Python 3** for data build script

---

## 📱 Follow Us

- Instagram: [@nihongo_1013](https://www.instagram.com/nihongo_1013)

---

## 📄 License

This project is open source. Feel free to use and modify for educational purposes.

---

*Built with ❤️ for Japanese language learners everywhere* 🇯🇵
