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

        // Épargne annuelle utilisée pour la projection FIRE : on utilise la
        // croissance réelle du patrimoine (patrimoine_annuel = cash épargné
        // + montant investi cette année) plutôt que revenus - dépenses, qui
        // ignore la performance des investissements et sous-estime le
        // rythme réel d'épargne. Cette mesure correspond à ce que
        // taux_epargne_annuel utilise déjà dans le Sheet lui-même.
        const revenusAnnuels = DATA.budget.revenus_annuel || 0;
        const depensesAnnuelles = DATA.budget.depenses_annuel || 0;
        DATA.epargneAnnuelle = DATA.budget.patrimoine_annuel > 0
            ? DATA.budget.patrimoine_annuel
            : Math.max(0, revenusAnnuels - depensesAnnuelles); // repli si patrimoine_annuel absent
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
            const labelsRaw = [];
            const valeursRaw = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i]) continue;
                const cols = splitCsvLine(lines[i], sep);
                if (cols.length < 2) continue;
                labelsRaw.push(cols[0].trim());
                valeursRaw.push(nettoyerNombre(cols[1].trim().replace(/^\"|\"$/g, "")));
            }

            // Certains Sheets reportent automatiquement la derniere valeur
            // connue sur les mois futurs non-encore-atteints (formule de
            // report). Ca cree un plateau artificiel en fin de courbe qui
            // donne l'impression que le patrimoine a arrete de croitre.
            // On coupe la queue de valeurs strictement identiques et
            // consecutives en fin de serie (on garde le premier point de
            // ce plateau, qui correspond au dernier mois reellement suivi).
            let coupureIndex = valeursRaw.length;
            if (valeursRaw.length > 2) {
                const derniereValeur = valeursRaw[valeursRaw.length - 1];
                let j = valeursRaw.length - 1;
                while (j > 0 && valeursRaw[j - 1] === derniereValeur) j--;
                // j pointe maintenant sur le premier point du plateau final
                if (valeursRaw.length - j >= 2) coupureIndex = j + 1;
            }
            const labels = labelsRaw.slice(0, coupureIndex);
            const valeurs = valeursRaw.slice(0, coupureIndex);

            if (typeof updatePatrimoineChart === "function") updatePatrimoineChart(labels, valeurs, DATA.objectif250k);
            if (typeof updateHeroSparkline === "function") updateHeroSparkline(valeurs);

            // Badge de tendance : variation entre les 2 derniers points connus
            try {
                const pointsValides = valeurs.filter((v) => v && v > 0);
                if (pointsValides.length >= 2) {
                    const dernier = pointsValides[pointsValides.length - 1];
                    const precedent = pointsValides[pointsValides.length - 2];
                    const deltaPct = precedent > 0 ? ((dernier - precedent) / precedent) * 100 : 0;
                    const trendEl = document.getElementById("heroTrend");
                    if (trendEl && Math.abs(deltaPct) > 0.05) {
                        trendEl.style.display = "";
                        trendEl.className = "hero-trend " + (deltaPct >= 0 ? "up" : "down");
                        trendEl.textContent = (deltaPct >= 0 ? "▲ +" : "▼ ") + deltaPct.toFixed(1) + "%";
                    }
                }
            } catch (e) {
                console.warn("Tendance héros non calculable:", e);
            }
            console.log("Graphiques OK ✅");
        } catch (e) {
            console.warn("Erreur parsing evolution chart:", e);
        }

        // Objectifs parsing (robust + dynamique)
        // API_OBJECTIF contient 2 familles de lignes :
        //  - objectifs d'épargne (appartement, voiture, vacances, fonds_urgence, patrimoine_total)
        //    -> déjà affichés via des barres dédiées (id="goal-xxx" / "bar-xxx")
        //  - métriques annuelles (revenue_annuel, depense_annuel, epargne_annuel, investis_annuel)
        //    -> affichées dynamiquement dans la nouvelle section "Objectifs Annuels"
        const OBJECTIFS = {};
        try {
            const sample = objectifTxt || "";
            const sep = detectSeparator(sample);
            const lines = (objectifTxt || "").replace(/\r/g, "").trim().split("\n");
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i]) continue;
                const cols = splitCsvLine(lines[i], sep);
                if (cols.length < 3) continue;
                const nom = cols[0].trim().replace(/^\"|\"$/g, "");
                const cible = nettoyerNombre(cols[1].trim().replace(/^\"|\"$/g, ""));
                const actuel = nettoyerNombre(cols[2].trim().replace(/^\"|\"$/g, ""));
                if (!nom) continue;
                OBJECTIFS[nom] = { cible, actuel };
            }

            // Objectif patrimoine 250k : piloté dynamiquement par le Sheet
            // (au lieu d'une valeur figée dans le code)
            if (OBJECTIFS.patrimoine_total && OBJECTIFS.patrimoine_total.cible > 0) {
                DATA.objectif250k = OBJECTIFS.patrimoine_total.cible;
                DATA.restant250k = Math.max(0, DATA.objectif250k - DATA.patrimoine);
                DATA.progression250k = DATA.patrimoine > 0 ? (DATA.patrimoine / DATA.objectif250k) * 100 : 0;
                DATA.anneesRestantes = DATA.epargneAnnuelle > 0 ? DATA.restant250k / DATA.epargneAnnuelle : 0;
                DATA.projectionAnnee = new Date().getFullYear() + Math.ceil(DATA.anneesRestantes);
                // re-synchroniser l'affichage deja fait plus haut avec la cible dynamique
                if (DOM.summaryProgress) DOM.summaryProgress.textContent = formatPourcentage(DATA.progression250k);
                if (DOM.summaryRemaining) DOM.summaryRemaining.textContent = formatEUR(DATA.restant250k);
                if (DOM.projectionDate) DOM.projectionDate.innerHTML = DATA.projectionAnnee + "<br><small>" + DATA.anneesRestantes.toFixed(1) + " ans</small>";
                if (DOM.fireProgress) DOM.fireProgress.textContent = DATA.progression250k.toFixed(1) + " %";
                if (DOM.mainGoalProgress) DOM.mainGoalProgress.textContent = "🎯 " + DATA.progression250k.toFixed(1) + "% vers " + Math.round(DATA.objectif250k / 1000) + "k";
                if (DOM.fireDetails) DOM.fireDetails.innerHTML = "Patrimoine : " + formatEUR(DATA.patrimoine) + "<br>Objectif : " + formatEUR(DATA.objectif250k) + "<br>Progression : " + DATA.progression250k.toFixed(1) + " %<br>Reste : " + formatEUR(DATA.restant250k) + "<br>Épargne annuelle : " + formatEUR(DATA.epargneAnnuelle) + "<br>Projection : " + DATA.projectionAnnee + " (~" + DATA.anneesRestantes.toFixed(1) + " ans)";
                if (DOM.fireBar) DOM.fireBar.style.width = Math.min(DATA.progression250k, 100) + "%";
                // redessine le graphique patrimoine avec la cible reelle (il avait ete
                // dessine plus haut avec la valeur par defaut, avant que l'objectif
                // dynamique ne soit connu)
                if (typeof updatePatrimoineChart === "function") {
                    updatePatrimoineChart(lastPatrimoine.labels, lastPatrimoine.valeurs, DATA.objectif250k);
                }
            }

            // Barres des objectifs d'épargne (comportement existant, conservé)
            ["appartement", "voiture", "vacances", "fonds_urgence", "patrimoine_total"].forEach((objectif) => {
                const o = OBJECTIFS[objectif];
                if (!o || o.cible <= 0) return;
                const pourcentage = (o.actuel / o.cible) * 100;
                const label = document.getElementById("goal-" + objectif);
                const barre = document.getElementById("bar-" + objectif);
                if (label) label.textContent = `${Math.round(o.actuel).toLocaleString("fr-FR")} € / ${Math.round(o.cible).toLocaleString("fr-FR")} € (${pourcentage.toFixed(1)}%)`;
                if (barre) {
                    barre.style.width = `${Math.min(pourcentage, 100)}%`;
                    let couleurBarre;
                    if (pourcentage < 25) couleurBarre = "#F0576B";
                    else if (pourcentage < 50) couleurBarre = "#F5A623";
                    else if (pourcentage < 75) couleurBarre = "#4EC5CF";
                    else couleurBarre = "#2DD4A7";
                    barre.style.background = couleurBarre;
                    const parentCard = barre.closest(".goal-card");
                    if (parentCard) parentCard.style.borderLeftColor = couleurBarre;
                }
            });

            // Métriques annuelles (nouveau) : rendu dynamique dans #objectifsAnnuelsContainer
            const ANNUELS = [
                { key: "revenue_annuel", label: "💰 Revenus", lowerIsBetter: false },
                { key: "depense_annuel", label: "💸 Dépenses", lowerIsBetter: true },
                { key: "epargne_annuel", label: "🏦 Épargne", lowerIsBetter: false },
                { key: "investis_annuel", label: "📈 Investissements", lowerIsBetter: false },
            ];
            const container = document.getElementById("objectifsAnnuelsContainer");
            if (container) {
                container.innerHTML = "";
                ANNUELS.forEach(({ key, label, lowerIsBetter }) => {
                    const o = OBJECTIFS[key];
                    if (!o || o.cible <= 0) return;
                    const pourcentage = (o.actuel / o.cible) * 100;
                    // "en bonne voie" : pour les dépenses, être sous la cible est positif ;
                    // pour le reste, être proche/au-dessus de la cible est positif.
                    const enBonneVoie = lowerIsBetter ? o.actuel <= o.cible : pourcentage >= 75;
                    const surCible = lowerIsBetter ? o.actuel > o.cible : false;
                    let couleur = "#4EC5CF";
                    if (surCible) couleur = "#F0576B";
                    else if (enBonneVoie) couleur = "#2DD4A7";
                    else if (pourcentage < 50 && !lowerIsBetter) couleur = "#F5A623";

                    const card = document.createElement("div");
                    card.className = "objectif-annuel-card";
                    card.style.borderLeftColor = couleur;
                    card.innerHTML = `
                        <div class="goal-header">
                            <span>${label}</span>
                            <span style="color:${couleur}">${Math.round(o.actuel).toLocaleString("fr-FR")} € / ${Math.round(o.cible).toLocaleString("fr-FR")} €</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width:${Math.min(pourcentage, 100)}%;background:${couleur}"></div>
                        </div>
                        <div class="objectif-annuel-pct" style="color:${couleur}">${pourcentage.toFixed(0)}%${lowerIsBetter ? (surCible ? " — dépassement" : " du budget utilisé") : " atteint"}</div>
                    `;
                    container.appendChild(card);
                });
            }

            console.log("Objectifs OK ✅", OBJECTIFS);
        } catch (e) {
            console.warn("Erreur parsing objectifs:", e);
        }

        // Composition du portefeuille (nouveau) : PEA (Actions/ETF) + CTO (Actions/ETF/Crypto)
        // Ces données étaient déjà récupérées (DATA.pea / DATA.cto) mais jamais affichées.
        try {
            if (typeof updatePeaCompositionChart === "function") {
                updatePeaCompositionChart(DATA.pea.pea_action || 0, DATA.pea.pea_etf || 0);
            }
            if (typeof updateCtoCompositionChart === "function") {
                updateCtoCompositionChart(DATA.cto.cto_action || 0, DATA.cto.cto_etf || 0, DATA.cto.cto_crypto || 0);
            }
            const peaPositions = document.getElementById("peaPositions");
            if (peaPositions) peaPositions.textContent = (DATA.pea.nombre_position || 0) + " position" + ((DATA.pea.nombre_position || 0) > 1 ? "s" : "");
            const ctoPositions = document.getElementById("ctoPositions");
            if (ctoPositions) ctoPositions.textContent = (DATA.cto.nombre_position || 0) + " position" + ((DATA.cto.nombre_position || 0) > 1 ? "s" : "") + " · 1 EUR = " + (DATA.cto.eur_chf || 0).toFixed(2) + " CHF";
            console.log("Composition portefeuille OK ✅");
        } catch (e) {
            console.warn("Erreur composition portefeuille:", e);
        }

        // Suivi mensuel (nouveau, optionnel) : n'affiche la section que si
        // API_BUDGET_MENSUEL est configuré côté Cloudflare (sinon la section reste masquée,
        // aucune alerte affichée pour ne pas gêner tant que ce n'est pas branché).
        try {
            const monthlySection = document.getElementById("monthlyBudgetSection");
            if (window.CONFIG.URL_BUDGET_MENSUEL) {
                let monthlyTxt = "";
                try {
                    const r = await fetch(window.CONFIG.URL_BUDGET_MENSUEL);
                    if (r.ok) monthlyTxt = await r.text();
                } catch (fetchErr) {
                    // silencieux : feature optionnelle, pas encore configuree
                }
                if (monthlyTxt) {
                    const sep = detectSeparator(monthlyTxt);
                    const lines = monthlyTxt.replace(/\r/g, "").trim().split("\n");
                    const labels = [], revenus = [], depenses = [];
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i]) continue;
                        const cols = splitCsvLine(lines[i], sep);
                        if (cols.length < 3) continue;
                        const rev = nettoyerNombre(cols[1]);
                        const dep = nettoyerNombre(cols[2]);
                        if (rev === 0 && dep === 0) continue; // ligne future non renseignée
                        labels.push(cols[0].trim());
                        revenus.push(rev);
                        depenses.push(dep);
                    }
                    if (labels.length && typeof updateMonthlyBudgetChart === "function") {
                        updateMonthlyBudgetChart(labels, revenus, depenses);
                        if (monthlySection) monthlySection.style.display = "";
                    }
                }
            }
        } catch (e) {
            console.warn("Suivi mensuel non disponible:", e);
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
