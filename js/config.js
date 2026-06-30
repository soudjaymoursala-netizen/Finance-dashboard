/* ========================================== */
/* CONFIGURATION GLOBALE                      */
/* ========================================== */

window.CONFIG = {

    URL_BUDGET:
        "https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID_BUDGET/export?format=csv&gid=519498006",

    URL_EVOLUTION:
        "https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID_BUDGET/export?format=csv&gid=810332816",

    URL_OBJECTIF:
        "https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID_BUDGET/export?format=csv&gid=1700667008",

    URL_PEA:
        "https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID_PEA/export?format=csv&gid=1971681206",

    URL_CTO:
        "https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID_CTO/export?format=csv&gid=1361663202"

};

/* Compatibilité maximale */
const CONFIG = window.CONFIG;

/* ========================================== */
/* GESTION DU THEME                           */
/* ========================================== */

const themeToggle = document.getElementById('themeToggle');
const body = document.body;

themeToggle.addEventListener('click', () => {
  body.classList.toggle('light');
  
  // Changer l'icône du bouton selon le thème
  if (body.classList.contains('light')) {
    themeToggle.innerHTML = '☀️';
  } else {
    themeToggle.innerHTML = '🌙';
  }
});
