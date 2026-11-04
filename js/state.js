const $ = id => document.getElementById(id);

let pool = [];
let shuffled = false;
let selectedLang = DEFAULT_LANG;
let currentSpeakingBtn = null;
let allVoices = [];
let jpVoices = [];
let meaningVoices = [];
let autoplayActive = false;
let autoplayIndex = 0;
let selectedCardIndex = 0;
