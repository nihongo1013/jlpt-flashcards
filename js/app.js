/* JLPT Flashcards — app bootstrap */

$("q").addEventListener("input", filter);
$("lv").addEventListener("change", () => {
  fillCats();
  filter();
});
$("cat").addEventListener("change", filter);

$("shuf").addEventListener("click", () => {
  shuffled = !shuffled;
  const status = $("shuf").querySelector(".toggle-status");
  if (status) status.textContent = shuffled ? "ON" : "OFF";
  $("shuf").classList.toggle("on", shuffled);
  filter();
});

$("langSelect").addEventListener("change", () => {
  selectedLang = $("langSelect").value || DEFAULT_LANG;
  updateMeaningVoices();
  filter();
  if ($("fsOverlay").classList.contains("on")) renderFSCard();
});

function bindDialogHandlers() {
  const settingsDialog = $("settingsDialog");
  if (settingsDialog) {
    settingsDialog.addEventListener("click", function (e) {
      if (e.target === settingsDialog) toggleSettingsDialog();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (settingsDialog && settingsDialog.classList.contains("on")) {
        toggleSettingsDialog();
      }
    }
  });
}

selectedLang = $("langSelect").value || DEFAULT_LANG;
initVoices();
fillCats();
filter();
bindDialogHandlers();
startSakura();
