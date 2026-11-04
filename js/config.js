/* Language registry — add a new language here, in the CSV, and in index.html */
const LANGUAGES = {
  en: { label: "English", langCode: "en-US", field: "m",  textClass: "en-t", icon: "🇬🇧" },
  hi: { label: "हिंदी",    langCode: "hi-IN", field: "h",  textClass: "hi-t", icon: "🇮🇳" },
  te: { label: "తెలుగు",  langCode: "te-IN", field: "te", textClass: "te-t", icon: "🇮🇳" },
};

const DEFAULT_LANG = "en";

const CAT_MAP = {
  "Clothes": "Nouns — Clothes",
  "Animals & nature": "Nouns — Animals & Nature", "Nouns — Animals": "Nouns — Animals & Nature",
  "Body & health": "Nouns — Body & Health", "Nouns — Body": "Nouns — Body & Health", "Nouns — Health": "Nouns — Body & Health", "Nouns — Senses": "Nouns — Body & Health",
  "Food & drink": "Nouns — Food & Drink", "Nouns — Food": "Nouns — Food & Drink",
  "People, family & jobs": "Nouns — People, Family & Jobs", "Nouns — People": "Nouns — People, Family & Jobs",
  "Places, buildings & position": "Nouns — Places & Position", "Nouns — Places": "Nouns — Places & Position", "Nouns — Position": "Nouns — Places & Position", "Nouns — Directions": "Nouns — Places & Position",
  "Transport & travel": "Nouns — Transport & Travel", "Nouns — Transport": "Nouns — Transport & Travel", "Nouns — Travel": "Nouns — Transport & Travel",
  "Time, days & calendar": "Nouns — Time & Calendar", "Nouns — Time": "Nouns — Time & Calendar",
  "School, study & work": "Nouns — School & Work", "Nouns — School": "Nouns — School & Work", "Nouns — Work": "Nouns — School & Work",
  "Sports & hobbies": "Nouns — Sports & Hobbies", "Nouns — Sports": "Nouns — Sports & Hobbies", "Nouns — Hobbies": "Nouns — Sports & Hobbies",
  "Things & household objects": "Nouns — Things & Objects", "Nouns — Things": "Nouns — Things & Objects", "Nouns — Shopping": "Nouns — Things & Objects", "Nouns — Shapes": "Nouns — Things & Objects", "Nouns — Materials": "Nouns — Things & Objects",
  "Conjunctions & linking words": "Conjunctions",
  "Numbers & counters": "Counters & Numbers", "Counters": "Counters & Numbers", "Nouns — Numbers": "Counters & Numbers", "Nouns — Measures": "Counters & Numbers", "Nouns — Quantity": "Counters & Numbers",
  "Greetings & set expressions": "Expressions & Greetings", "Expressions": "Expressions & Greetings",
  "Particles & conjunctions": "Particles", "Particles & grammar patterns": "Particles", "Nouns — Language": "Particles",
  "Adjectives & description": "Adjectives — Description", "Adjectives — other": "Adjectives — General", "Adjectives (seen in N5 passages)": "Adjectives — General", "Nouns — Colors": "Adjectives — Colors",
  "Verbs — everyday actions": "Verbs — Action", "Verbs — other": "Verbs — General", "Verbs (frequent in N5 reading & listening)": "Verbs — Action",
  "Everyday & abstract nouns": "Nouns — General", "Other words": "General", "Common": "General",
  "Keigo — Kenjougo": "Keigo", "Keigo — Polite": "Keigo", "Keigo — Sonkeigo": "Keigo",
  "Common Phrases": "Common Phrases",
};

const SPEAKER_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9V15H7L12 20V4L7 9H3Z" fill="white"/><path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="white"/><path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.84 14 18.7V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="white"/></svg>';
const SPEAKER_SVG_SM = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9V15H7L12 20V4L7 9H3Z" fill="white"/><path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill="white"/><path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.84 14 18.7V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="white"/></svg>';
