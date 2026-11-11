/* Legacy JLPT CSV meaning languages. Only complete CSV columns belong here. */
const LANGUAGES = {
  en: { label: "English", langCode: "en-US", field: "m", textClass: "en-t" },
  hi: { label: "हिंदी",    langCode: "hi-IN", field: "h", textClass: "hi-t" },
};

const DEFAULT_LANG = "en";

const CAT_MAP = {
  "Clothes": "Nouns - Clothes",
  "Animals & nature": "Nouns - Animals & Nature", "Nouns - Animals": "Nouns - Animals & Nature",
  "Body & health": "Nouns - Body & Health", "Nouns - Body": "Nouns - Body & Health", "Nouns - Health": "Nouns - Body & Health", "Nouns - Senses": "Nouns - Body & Health",
  "Food & drink": "Nouns - Food & Drink", "Nouns - Food": "Nouns - Food & Drink",
  "People, family & jobs": "Nouns - People, Family & Jobs", "Nouns - People": "Nouns - People, Family & Jobs",
  "Places, buildings & position": "Nouns - Places & Position", "Nouns - Places": "Nouns - Places & Position", "Nouns - Position": "Nouns - Places & Position", "Nouns - Directions": "Nouns - Places & Position",
  "Transport & travel": "Nouns - Transport & Travel", "Nouns - Transport": "Nouns - Transport & Travel", "Nouns - Travel": "Nouns - Transport & Travel",
  "Time, days & calendar": "Nouns - Time & Calendar", "Nouns - Time": "Nouns - Time & Calendar",
  "School, study & work": "Nouns - School & Work", "Nouns - School": "Nouns - School & Work", "Nouns - Work": "Nouns - School & Work",
  "Sports & hobbies": "Nouns - Sports & Hobbies", "Nouns - Sports": "Nouns - Sports & Hobbies", "Nouns - Hobbies": "Nouns - Sports & Hobbies",
  "Things & household objects": "Nouns - Things & Objects", "Nouns - Things": "Nouns - Things & Objects", "Nouns - Shopping": "Nouns - Things & Objects", "Nouns - Shapes": "Nouns - Things & Objects", "Nouns - Materials": "Nouns - Things & Objects",
  "Conjunctions & linking words": "Conjunctions",
  "Numbers & counters": "Counters & Numbers", "Counters": "Counters & Numbers", "Nouns - Numbers": "Counters & Numbers", "Nouns - Measures": "Counters & Numbers", "Nouns - Quantity": "Counters & Numbers",
  "Greetings & set expressions": "Expressions & Greetings", "Expressions": "Expressions & Greetings",
  "Particles & conjunctions": "Particles", "Particles & grammar patterns": "Particles", "Nouns - Language": "Particles",
  "Adjectives & description": "Adjectives - Description", "Adjectives - other": "Adjectives - General", "Adjectives (seen in N5 passages)": "Adjectives - General", "Nouns - Colors": "Adjectives - Colors",
  "Verbs - everyday actions": "Verbs - Action", "Verbs - other": "Verbs - General", "Verbs (frequent in N5 reading & listening)": "Verbs - Action",
  "Everyday & abstract nouns": "Nouns - General", "Other words": "General", "Common": "General",
  "Keigo - Kenjougo": "Keigo", "Keigo - Polite": "Keigo", "Keigo - Sonkeigo": "Keigo",
  "Common Phrases": "Common Phrases",
};

const SPEAKER_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9V15H7L12 20V4L7 9H3Z" fill="currentColor"/><path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="currentColor"/><path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.84 14 18.7V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="currentColor"/></svg>';
const SPEAKER_SVG_SM = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9V15H7L12 20V4L7 9H3Z" fill="currentColor"/><path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="currentColor"/><path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.84 14 18.7V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="currentColor"/></svg>';

/* Generic deck settings and shared helpers */
const DEFAULT_DECK_MODE = "dictionary";
const DEFAULT_SOURCE_LANG = "ja";
const DEFAULT_TARGET_LANG = "en";
const VISIBLE_CARD_STEP = 80;

function stripTilde(text) {
  return (text || "").replace(/[〜~]/g, "").replace(/\*\*\//g, "").trim();
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value) {
  const url = String(value || "").trim();
  if (/^https?:\/\//i.test(url)) return url;
  // Allow same-site relative paths, but never a scheme such as javascript:.
  if (/^(\/|\.\/|[\w.-]+(?:\/[\w.-]+)*)(?:[?#][\w=&%./-]*)?$/i.test(url) && !url.includes("..")) {
    return url;
  }
  return "";
}

function normalizeSearch(value) {
  try {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .trim();
  } catch (_) {
    return String(value || "").toLocaleLowerCase().trim();
  }
}

function formatCount(value) {
  try {
    return new Intl.NumberFormat().format(value);
  } catch (_) {
    return String(value);
  }
}

/* Widely used languages shown first in each of the two selectors.
 * Every code must exist in data/dictionary/meta.js; remaining languages are
 * still available in the regional groups below the quick-pick group. */
const POPULAR_LANGUAGE_CODES = [
  "en", "fr", "de", "es", "pt", "it", "ru", "ar", "he", "fa", "tr",
  "zh-Hans", "zh-Hant", "ja", "ko", "hi", "bn", "te", "ta", "ur", "mr",
  "gu", "kn", "ml", "or", "pa", "ne", "si",
  "id", "ms", "vi", "th", "fil", "my", "km", "lo", "mn", "kk", "uz", "ug",
  "nl", "pl", "sv", "no", "da", "fi", "el", "cs", "sk", "ro", "hu",
  "uk", "bg", "hr", "sr", "is", "ga", "cy", "eu", "ca", "gl", "la", "eo",
  "sw", "af", "am", "ha", "ig", "yo", "so", "zu", "xh", "st", "sn", "ny",
  "mi", "sm", "haw", "ceb", "jv", "su", "hmn",
];
