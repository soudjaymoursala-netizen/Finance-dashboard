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

if (!themeToggle) {
    console.error('themeToggle introuvable');
} else {

    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'light') {
        document.body.classList.add('light');
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('light');
        themeToggle.textContent = '🌙';
    }

    console.log('Listener thème installé');

themeToggle.addEventListener('click', () => {

    if (document.body.classList.contains('light')) {
    document.body.classList.remove('light');
} else {
    document.body.classList.add('light');
}

const isLight = document.body.classList.contains('light');

console.log(
    'BODY CLASS =',
    document.body.className);

    localStorage.setItem( 'theme', isLight ? 'light' : 'dark'  );

    themeToggle.textContent =
        isLight ? '☀️' : '🌙';

});
