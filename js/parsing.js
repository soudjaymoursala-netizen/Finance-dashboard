/* ================================================== */
/* PARSING & FORMATAGE                                */
/* Fonctions pures (pas d'etat, pas de DOM sauf        */
/* lireCSVKPI qui appelle showError en cas d'echec).   */
/* Extrait de googleSheets.js pour lisibilite.         */
/* ================================================== */

function nettoyerNombre(valeur) {

    if (
        valeur === null ||
        valeur === undefined ||
        valeur === ""
    ) {
        return 0;
    }

    return parseFloat(
        valeur
            .toString()
            .replace(/"/g, "")
            .replace(/\u202F/g, "")
            .replace(/\u00A0/g, "")
            .replace(/\s/g, "")
            .replace(",", ".")
    ) || 0;

}

function formatEUR(valeur) {

    return Number(
        valeur || 0
    ).toLocaleString(
        "fr-FR",
        {
            maximumFractionDigits: 0
        }
    ) + " €";

}

function formatCHF(valeur) {

    return Number(
        valeur || 0
    ).toLocaleString(
        "fr-FR",
        {
            maximumFractionDigits: 0
        }
    ) + " CHF";

}

function formatPourcentage(valeur) {

    return Number(
        valeur || 0
    ).toFixed(1) + " %";

}

/* ================================================== */
/* CSV helpers                                        */
/* ================================================== */
function detectSeparator(sampleText) {
    const sample = (sampleText || "").slice(0, 2000);
    const commas = (sample.match(/,/g) || []).length;
    const semis = (sample.match(/;/g) || []).length;
    return (semis > commas) ? ";" : ",";
}

function splitCsvLine(line, sep) {
    // split by sep not inside quotes
    const re = new RegExp(sep + "(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
    return line.split(re);
}

/* ================================================== */
/* LECTURE CSV KPI                                    */
/* Robust: detects separator and handles quoted vals  */
/* ================================================== */

function lireCSVKPI(csv) {
    try {
        if (!csv) {
            showError("CSV introuvable ou vide lors du parsing des KPI.");
            return {};
        }

        const text = csv.replace(/\r/g, "").trim();
        if (!text) {
            showError("CSV vide après nettoyage (retours chariot retirés).");
            return {};
        }

        const lignes = text.split("\n");
        if (lignes.length < 2) return {};

        const sample = lignes.slice(0, Math.min(6, lignes.length)).join("\n");
        const sep = detectSeparator(sample);

        const resultat = {};

        for (let i = 1; i < lignes.length; i++) {
            const ligne = lignes[i];
            if (!ligne || !ligne.trim()) continue;
            const cols = splitCsvLine(ligne, sep);
            if (cols.length < 2) continue;
            const key = cols[0].trim().replace(/^\"|\"$/g, "");
            const valRaw = cols.slice(1).join(sep).trim().replace(/^\"|\"$/g, "");
            resultat[key] = nettoyerNombre(valRaw);
        }

        if (Object.keys(resultat).length === 0) {
            showError("Parser CSV : aucune clé reconnue dans le CSV des KPI. Vérifie le format (séparateur ',' vs ';').");
        }

        return resultat;
    } catch (e) {
        console.error("Erreur lors du parsing CSV:", e);
        showError("Erreur lors du parsing du CSV des KPI. Voir la console pour plus de détails.");
        return {};
    }
}
