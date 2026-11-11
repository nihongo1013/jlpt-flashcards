/* Shared, mutable application state */
const $ = id => document.getElementById(id);

let deckMode = DEFAULT_DECK_MODE;
let selectedLang = DEFAULT_LANG;          // meaning language for the legacy JLPT deck
let sourceLang = DEFAULT_SOURCE_LANG;     // front/prompt language for dictionary pairs
let targetLang = DEFAULT_TARGET_LANG;     // back/answer language for dictionary pairs

let allCards = [];                        // every card available for the active deck/pair
let pool = [];                            // filtered card list
let visibleLimit = VISIBLE_CARD_STEP;
let shuffled = false;
let showSenseContext = false;
let selectedCardIndex = 0;
let speechRate = 1;
let cardTextMax = 96;

let currentSpeakingBtn = null;
let allVoices = [];
let voicesBySide = { front: [], back: [] };

let autoplayActive = false;
let autoplayIndex = 0;

let deckLoadToken = 0;
let fsRenderToken = 0;
const packLoadPromises = {};
