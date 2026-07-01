/* ================================================== */
/* FINANCE DASHBOARD V5 - googleSheets.js (patched)   */
/* ================================================== */

/* ================================================== */
/* UTILITAIRES                                        */
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
            console.log("CSV preview:", text.slice(0, 1000));
        }

        return resultat;
    } catch (e) {
        console.error("Erreur lors du parsing CSV:", e);
        showError("Erreur lors du parsing du CSV des KPI. Voir la console pour plus de détails.");
        return {};
    }
}

/* ================================================== */
/* ANIMATION KPI                                      */
/* ================================================== */

function animerValeur(element, valeurFinale, suffixe = "") {
    if (!element) return;
    const duree = 1000;
    const pas = 30;
    const increment = valeurFinale / (duree / pas);
    let valeur = 0;
    const timer = setInterval(() => {
        valeur += increment;
        if (valeur >= valeurFinale) {
            valeur = valeurFinale;
            clearInterval(timer);
        }
        element.textContent = Math.round(valeur).toLocaleString("fr-FR") + suffixe;
    }, pas);
}

/* ================================================== */
/* DOM                                                 */
/* ================================================== */
const DOM = {
    networth: document.getElementById("networth"),
    cash: document.getElementById("cash"),
    pea: document.getElementById("pea"),
    cto: document.getElementById("cto"),
    investments: document.getElementById("investments"),
    performance: document.getElementById("performance"),
    totalGain: document.getElementById("totalGain"),
    globalPerformance: document.getElementById("globalPerformance"),
    capitalInvesti: document.getElementById("capitalInvesti"),
    ratioInvesti: document.getElementById("ratioInvesti"),
    summaryNetworth: document.getElementById("summaryNetworth"),
    summaryProgress: document.getElementById("summaryProgress"),
    summaryRemaining: document.getElementById("summaryRemaining"),
    fireProgress: document.getElementById("fireProgress"),
    fireDetails: document.getElementById("fireDetails"),
    fireBar: document.getElementById("fireBar"),
    projectionDate: document.getElementById("projectionDate"),
    mainGoalProgress: document.getElementById("mainGoalProgress"),
    lastUpdate: document.getElementById("lastUpdate"),
};

/* ================================================== */
/* DATA                                                */
/* ================================================== */
const DATA = {
    budget: {},
    pea: {},
    cto: {},
    patrimoine: 0,
    objectif250k: 250000,
    progression250k: 0,
    restant250k: 0,
    plusValueTotale: 0,
    capitalInvesti: 0,
    performanceGlobale: 0,
    ratioInvesti: 0,
    epargneAnnuelle: 0,
    anneesRestantes: 0,
    projectionAnnee: 0,
    ctoValeurEUR: 0,
    ctoInvestiEUR: 0,
    ctoPlusValueEUR: 0,
};

/* ================================================== */
/* CHARGEMENT DASHBOARD                               */
/* ================================================== */

async function chargerDashboard() {
    try {
        console.log("CONFIG =", window.CONFIG);
        if (!window.CONFIG) throw new Error("window.CONFIG introuvable");

        // helper to fetch and handle errors
        async function fetchTextOrLog(url, label) {
            try {
                const r = await fetch(url);
                if (!r.ok) {
                    showError(`${label} fetch failed: ${r.status} ${r.statusText}`);
                    return "";
                }
                return await r.text();
            } catch (e) {
                showError(`${label} fetch error: ${e.message}`);
                console.error(e);
                return "";
            }
        }

        const [budgetTxt, ctoTxt, peaTxt, evolutionTxt, objectifTxt] = await Promise.all([
            fetchTextOrLog(window.CONFIG.URL_BUDGET, "Budget"),
            fetchTextOrLog(window.CONFIG.URL_CTO, "CTO"),
            fetchTextOrLog(window.CONFIG.URL_PEA, "PEA"),
            fetchTextOrLog(window.CONFIG.URL_EVOLUTION, "Evolution"),
            fetchTextOrLog(window.CONFIG.URL_OBJECTIF, "Objectif"),
        ]);

        DATA.budget = lireCSVKPI(budgetTxt);
        DATA.cto = lireCSVKPI(ctoTxt);
        DATA.pea = lireCSVKPI(peaTxt);

        console.log("Budget", DATA.budget);
        console.log("PEA", DATA.pea);
        console.log("CTO", DATA.cto);

        const tauxChange = DATA.cto.eur_chf || 1;
        DATA.ctoValeurEUR = (DATA.cto.cto_valeur_chf || 0) * tauxChange;
        DATA.ctoInvestiEUR = (DATA.cto.cto_investi_chf || 0) * tauxChange;
        DATA.ctoPlusValueEUR = (DATA.cto.cto_plusvalue_chf || 0) * tauxChange;

        DATA.patrimoine = DATA.budget.patrimoine_total || 0;
        DATA.progression250k = DATA.patrimoine > 0 ? (DATA.patrimoine / DATA.objectif250k) * 100 : 0;
        DATA.restant250k = Math.max(0, DATA.objectif250k - DATA.patrimoine);

        DATA.plusValueTotale = (DATA.pea.pea_plusvalue || 0) + DATA.ctoPlusValueEUR;
        DATA.capitalInvesti = (DATA.pea.pea_investi || 0) + DATA.ctoInvestiEUR;
        DATA.performanceGlobale = DATA.capitalInvesti > 0 ? (DATA.plusValueTotale / DATA.capitalInvesti) * 100 : 0;
        DATA.ratioInvesti = DATA.patrimoine > 0 ? ((DATA.budget.investissements_total || 0) / DATA.patrimoine) * 100 : 0;

        const revenusAnnuels = DATA.budget.revenus_annuel || 0;
        const depensesAnnuelles = DATA.budget.depenses_annuel || 0;
        DATA.epargneAnnuelle = Math.max(0, revenusAnnuels - depensesAnnuelles);
        DATA.anneesRestantes = DATA.epargneAnnuelle > 0 ? DATA.restant250k / DATA.epargneAnnuelle : 0;
        DATA.projectionAnnee = new Date().getFullYear() + Math.ceil(DATA.anneesRestantes);

        // Update DOM values
        animerValeur(DOM.networth, DATA.patrimoine, " €");
        animerValeur(DOM.cash, DATA.budget.cash_dispo_total || 0, " €");
        animerValeur(DOM.investments, DATA.budget.investissements_total || 0, " €");
        animerValeur(DOM.pea, DATA.pea.pea_valeur || 0, " €");
        animerValeur(DOM.cto, DATA.ctoValeurEUR, " €");
        if (DOM.performance) DOM.performance.textContent = ((DATA.budget.taux_epargne_annuel || 0) * 100).toFixed(0) + " %";

        if (DOM.summaryNetworth) DOM.summaryNetworth.textContent = formatEUR(DATA.patrimoine);
        if (DOM.summaryProgress) DOM.summaryProgress.textContent = formatPourcentage(DATA.progression250k);
        if (DOM.summaryRemaining) DOM.summaryRemaining.textContent = formatEUR(DATA.restant250k);

        if (DOM.totalGain) DOM.totalGain.textContent = DATA.plusValueTotale.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
        if (DOM.globalPerformance) DOM.globalPerformance.textContent = formatPourcentage(DATA.performanceGlobale);
        if (DOM.capitalInvesti) DOM.capitalInvesti.textContent = formatEUR(DATA.capitalInvesti);
        if (DOM.ratioInvesti) DOM.ratioInvesti.textContent = formatPourcentage(DATA.ratioInvesti);

        if (DOM.projectionDate) DOM.projectionDate.innerHTML = DATA.projectionAnnee + "<br><small>" + DATA.anneesRestantes.toFixed(1) + " ans</small>";
        if (DOM.fireProgress) DOM.fireProgress.textContent = DATA.progression250k.toFixed(1) + " %";
        if (DOM.mainGoalProgress) DOM.mainGoalProgress.textContent = "🎯 " + DATA.progression250k.toFixed(1) + "% vers 250k";
        if (DOM.fireDetails) DOM.fireDetails.innerHTML = "Patrimoine : " + formatEUR(DATA.patrimoine) + "<br>Objectif : " + formatEUR(DATA.objectif250k) + "<br>Progression : " + DATA.progression250k.toFixed(1) + " %<br>Reste : " + formatEUR(DATA.restant250k) + "<br>Épargne annuelle : " + formatEUR(DATA.epargneAnnuelle) + "<br>Projection : " + DATA.projectionAnnee + " (~" + DATA.anneesRestantes.toFixed(1) + " ans)";
        if (DOM.fireBar) DOM.fireBar.style.width = Math.min(DATA.progression250k, 100) + "%";
        if (DOM.lastUpdate) DOM.lastUpdate.textContent = "Dernière synchronisation : " + new Date().toLocaleString("fr-FR");

        console.log("Calculs financiers OK ✅");

        // Allocation chart
        if (typeof updateAllocationChart === "function") {
            updateAllocationChart(DATA.budget.cash_dispo_total || 0, DATA.pea.pea_valeur || 0, DATA.ctoValeurEUR || 0);
        }

        // Evolution chart parsing (robust)
        try {
            const sample = evolutionTxt || "";
            const sep = detectSeparator(sample);
            const lines = (evolutionTxt || "").replace(/\r/g, "").trim().split("\n");
            const labels = [];
            const valeurs = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i]) continue;
                const cols = splitCsvLine(lines[i], sep);
                if (cols.length < 2) continue;
                labels.push(cols[0].trim());
                valeurs.push(nettoyerNombre(cols[1].trim().replace(/^\"|\"$/g, "")));
            }
            if (typeof updatePatrimoineChart === "function") updatePatrimoineChart(labels, valeurs);
            console.log("Graphiques OK ✅");
        } catch (e) {
            console.warn("Erreur parsing evolution chart:", e);
        }

        // Objectifs parsing (robust)
        try {
            const sample = objectifTxt || "";
            const sep = detectSeparator(sample);
            const lines = (objectifTxt || "").replace(/\r/g, "").trim().split("\n");
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i]) continue;
                const cols = splitCsvLine(lines[i], sep);
                if (cols.length < 3) continue;
                const objectif = cols[0].trim();
                const cible = nettoyerNombre(cols[1].trim().replace(/^\"|\"$/g, ""));
                const actuel = nettoyerNombre(cols[2].trim().replace(/^\"|\"$/g, ""));
                if (cible <= 0) continue;
                const pourcentage = (actuel / cible) * 100;
                const label = document.getElementById("goal-" + objectif);
                const barre = document.getElementById("bar-" + objectif);
                if (label) label.textContent = `${Math.round(actuel).toLocaleString("fr-FR")} € / ${Math.round(cible).toLocaleString("fr-FR")} € (${pourcentage.toFixed(1)}%)`;
                if (barre) {
                    barre.style.width = `${Math.min(pourcentage, 100)}%`;
                    if (pourcentage < 25) barre.style.background = "#ef4444";
                    else if (pourcentage < 50) barre.style.background = "#f59e0b";
                    else if (pourcentage < 75) barre.style.background = "#3b82f6";
                    else barre.style.background = "#22c55e";
                }
            }
            console.log("Objectifs OK ✅");
        } catch (e) {
            console.warn("Erreur parsing objectifs:", e);
        }

        // theme handling unchanged
        const themeButton = document.getElementById("themeToggle");
        if (themeButton) {
            if (localStorage.getItem("theme") === "light") {
                document.body.classList.add("light");
                themeButton.textContent = "☀️";
                if (window.refreshCharts) window.refreshCharts();
            }
            themeButton.addEventListener("click", () => {
                document.body.classList.toggle("light");
                const isLight = document.body.classList.contains("light");
                themeButton.textContent = isLight ? "☀️" : "🌙";
                localStorage.setItem("theme", isLight ? "light" : "dark");
                if (window.refreshCharts) window.refreshCharts();
            });
        }

        console.log("Dashboard V5 chargé ✅");
    } catch (error) {
        console.error("Erreur Dashboard :", error);
        showError("Erreur lors du chargement du dashboard. Voir la console pour plus d'infos.");
    }
}

/* ================================================== */
/* INITIALISATION                                     */
/* ================================================== */

document.addEventListener("DOMContentLoaded", chargerDashboard);
