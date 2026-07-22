/* ================================================== */
/* CACHE HORS-LIGNE                                   */
/* Si un fetch echoue (Worker down, reseau coupe...),  */
/* on retombe sur le dernier CSV recupere avec succes  */
/* pour cette source (localStorage) plutot que          */
/* d'afficher un dashboard vide.                       */
/* Extrait de chargerDashboard (googleSheets.js) pour  */
/* lisibilite - etait auparavant des closures internes */
/* a la fonction, avec le meme comportement.           */
/* ================================================== */

const CACHE_PREFIX = "financeDashboard_cache_";

function lireCache(label) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + label);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function ecrireCache(label, csv) {
    try {
        localStorage.setItem(CACHE_PREFIX + label, JSON.stringify({ csv, date: new Date().toISOString() }));
    } catch (e) {
        // localStorage plein ou indisponible (navigation privee) : tant pis, pas de cache
    }
}

/* Recupere le texte d'une URL, avec repli sur le cache local en cas
   d'echec. Retourne un objet plutot qu'une simple chaine pour que
   l'appelant sache si la donnee vient du reseau ou d'un cache perime
   (et depuis quand), sans avoir a partager des variables de closure
   comme c'etait le cas avant l'extraction de cette fonction. */
async function fetchTextOrLog(url, label) {
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const txt = await r.text();
        ecrireCache(label, txt);
        return { text: txt, stale: false, cacheDate: null };
    } catch (e) {
        const cache = lireCache(label);
        if (cache && cache.csv) {
            console.warn(`${label} fetch echoue, utilisation du cache local (${cache.date}):`, e.message);
            return { text: cache.csv, stale: true, cacheDate: new Date(cache.date) };
        }
        showError(`${label} fetch error: ${e.message}`);
        console.error(e);
        return { text: "", stale: false, cacheDate: null };
    }
}
