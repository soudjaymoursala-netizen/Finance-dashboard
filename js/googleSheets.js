/* ================================================== */
/* FINANCE DASHBOARD V5 - ENHANCED                     */
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
/* UTILITAIRES AVANCES                                */
/* ================================================== */

/* Fetch avec retry automatique en cas d'échec */
async function fetchWithRetry(url, attempts = 2, delayMs = 1000) {
    for (let i = 0; i < attempts; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return response;
            }
            // Si status != 200, considère comme erreur et retry
            if (i < attempts - 1) {
                console.warn(`Fetch ${url} échoué (${response.status}), retry ${i + 1}/${attempts - 1}`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                throw new Error(`Fetch ${url} échoué: ${response.status} ${response.statusText}`);
            }
        } catch (err) {
            if (i < attempts - 1) {
                console.warn(`Fetch ${url} erreur (${err.message}), retry ${i + 1}/${attempts - 1}`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                throw err;
            }
        }
    }
}

/* Moyenne mobile sur une série de données */
function movingAverage(series, window = 3) {
    if (!series || series.length === 0) return [];
    const result = [];
    for (let i = 0; i < series.length; i++) {
        const start = Math.max(0, i - window + 1);
        const slice = series.slice(start, i + 1);
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
        result.push(avg);
    }
    return result;
}

/* Sauvegarde en cache localStorage */
function saveToCache(key, data) {
    try {
        localStorage.setItem(`DASHBOARD_CACHE_${key}`, JSON.stringify(data));
    } catch (e) {
        console.warn(`Impossible de sauvegarder en cache: ${e.message}`);
    }
}

/* Charge depuis le cache localStorage */
function loadFromCache(key) {
    try {
        const cached = localStorage.getItem(`DASHBOARD_CACHE_${key}`);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        console.warn(`Impossible de charger le cache: ${e.message}`);
        return null;
    }
}

/* ================================================== */
/* LECTURE CSV KPI                                    */
/* ================================================== */

function lireCSVKPI(csv) {

    const lignes =
        csv
            .replace(/\r/g, "")
            .trim()
            .split("\n");

    const resultat = {};

    for (
        let i = 1;
        i < lignes.length;
        i++
    ) {

        const ligne =
            lignes[i];

        const indexVirgule =
            ligne.indexOf(",");

        if (
            indexVirgule === -1
        ) {
            continue;
        }

        const cle =
            ligne
                .substring(
                    0,
                    indexVirgule
                )
                .trim();

        const valeur =
            ligne
                .substring(
                    indexVirgule + 1
                )
                .trim();

        resultat[cle] =
            nettoyerNombre(
                valeur
            );

    }

    return resultat;

}

/* ================================================== */
/* ANIMATION KPI                                      */
/* ================================================== */

function animerValeur(
    element,
    valeurFinale,
    suffixe = ""
) {

    if (!element) {
        return;
    }

    const duree = 1000;
    const pas = 30;

    const increment =
        valeurFinale /
        (duree / pas);

    let valeur = 0;

    const timer =
        setInterval(() => {

            valeur += increment;

            if (
                valeur >= valeurFinale
            ) {

                valeur = valeurFinale;

                clearInterval(
                    timer
                );

            }

            element.textContent =
                Math.round(valeur)
                    .toLocaleString(
                        "fr-FR"
                    )
                +
                suffixe;

        }, pas);

}

/* ================================================== */
/* DOM                                                 */
/* Tous les IDs HTML sont centralisés ici             */
/* ================================================== */

const DOM = {

    networth:
        document.getElementById(
            "networth"
        ),

    cash:
        document.getElementById(
            "cash"
        ),

    pea:
        document.getElementById(
            "pea"
        ),

    cto:
        document.getElementById(
            "cto"
        ),

    investments:
        document.getElementById(
            "investments"
        ),

    performance:
        document.getElementById(
            "performance"
        ),

    totalGain:
        document.getElementById(
            "totalGain"
        ),

    globalPerformance:
        document.getElementById(
            "globalPerformance"
        ),

    capitalInvesti:
        document.getElementById(
            "capitalInvesti"
        ),

    ratioInvesti:
        document.getElementById(
            "ratioInvesti"
        ),

    summaryNetworth:
        document.getElementById(
            "summaryNetworth"
        ),

    summaryProgress:
        document.getElementById(
            "summaryProgress"
        ),

    summaryRemaining:
        document.getElementById(
            "summaryRemaining"
        ),

    fireProgress:
        document.getElementById(
            "fireProgress"
        ),

    fireDetails:
        document.getElementById(
            "fireDetails"
        ),

    fireBar:
        document.getElementById(
            "fireBar"
        ),

    projectionDate:
        document.getElementById(
            "projectionDate"
        ),

    mainGoalProgress:
        document.getElementById(
            "mainGoalProgress"
        ),

    lastUpdate:
        document.getElementById(
            "lastUpdate"
        )

};

/* ================================================== */
/* DATA                                                */
/* Toutes les valeurs financières                      */
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

    // Nouveaux KPI
    tauxEpargneExact: 0,

    moisCouverture: 0,

    expositionInvestissements: 0

};

/* ================================================== */
/* CHARGEMENT DASHBOARD                               */
/* ================================================== */

async function chargerDashboard() {

    try {

 /* ========================================== */
/* CHARGEMENT DES SOURCES                     */
/* ========================================== */

console.log("CONFIG =", window.CONFIG);

if (!window.CONFIG) {
    throw new Error("window.CONFIG introuvable");
}

// Tenter fetch avec retry
let budgetResponse, ctoResponse, peaResponse, evolutionResponse, objectifResponse;

try {
    [budgetResponse, ctoResponse, peaResponse, evolutionResponse, objectifResponse] = await Promise.all([
        fetchWithRetry(window.CONFIG.URL_BUDGET),
        fetchWithRetry(window.CONFIG.URL_CTO),
        fetchWithRetry(window.CONFIG.URL_PEA),
        fetchWithRetry(window.CONFIG.URL_EVOLUTION),
        fetchWithRetry(window.CONFIG.URL_OBJECTIF)
    ]);
} catch (err) {
    console.warn("Fetch échoué, tentative chargement depuis cache...", err);
    showAlert(`⚠️ Impossible de charger les données — utilisation du cache local (peut être obsolète): ${err.message}`, "warning", 5000);
    // Charger depuis cache
    DATA.budget = loadFromCache("budget") || {};
    DATA.cto = loadFromCache("cto") || {};
    DATA.pea = loadFromCache("pea") || {};
    // Pour evolution et objectif, on continue même sans données (affichage partiel)
}

if (budgetResponse && ctoResponse && peaResponse) {
    /* ========================================== */
    /* PARSING CSV                                */
    /* ========================================== */

    DATA.budget = lireCSVKPI(await budgetResponse.text());
    saveToCache("budget", DATA.budget);

    DATA.cto = lireCSVKPI(await ctoResponse.text());
    saveToCache("cto", DATA.cto);

    DATA.pea = lireCSVKPI(await peaResponse.text());
    saveToCache("pea", DATA.pea);
}

        /* ========================================== */
        /* DEBUG                                      */
        /* ========================================== */

        console.log(
            "Budget",
            DATA.budget
        );

        console.log(
            "PEA",
            DATA.pea
        );

        console.log(
            "CTO",
            DATA.cto
        );

        /* ========================================== */
        /* NORMALISATION CTO CHF -> EUR               */
        /* ========================================== */

        const tauxChange =
            DATA.cto.eur_chf || 1;

        DATA.ctoValeurEUR =
            (DATA.cto.cto_valeur_chf || 0)
            *
            tauxChange;

        DATA.ctoInvestiEUR =
            (DATA.cto.cto_investi_chf || 0)
            *
            tauxChange;

        DATA.ctoPlusValueEUR =
            (DATA.cto.cto_plusvalue_chf || 0)
            *
            tauxChange;

        /* ========================================== */
        /* PATRIMOINE                                 */
        /* ========================================== */

        DATA.patrimoine =
            DATA.budget.patrimoine_total || 0;

        DATA.progression250k =
            DATA.patrimoine > 0
                ?
                (
                    DATA.patrimoine /
                    DATA.objectif250k
                ) * 100
                :
                0;

        DATA.restant250k =
            Math.max(
                0,
                DATA.objectif250k
                -
                DATA.patrimoine
            );

        /* ========================================== */
        /* PERFORMANCE GLOBALE                        */
        /* ========================================== */

        DATA.plusValueTotale =

            (DATA.pea.pea_plusvalue || 0)

            +

            DATA.ctoPlusValueEUR;

        DATA.capitalInvesti =

            (DATA.pea.pea_investi || 0)

            +

            DATA.ctoInvestiEUR;

        DATA.performanceGlobale =

            DATA.capitalInvesti > 0

            ?

            (
                DATA.plusValueTotale
                /
                DATA.capitalInvesti
            ) * 100

            :

            0;

        DATA.ratioInvesti =

            DATA.patrimoine > 0

            ?

            (
                (
                    DATA.budget.investissements_total || 0
                )
                /
                DATA.patrimoine
            ) * 100

            :

            0;

        /* ========================================== */
        /* CALCUL FIRE                                */
        /* ========================================== */

        const revenusAnnuels =

            DATA.budget.revenus_annuel || 0;

        const depensesAnnuelles =

            DATA.budget.depenses_annuel || 0;

        DATA.epargneAnnuelle =

            Math.max(
                0,
                revenusAnnuels
                -
                depensesAnnuelles
            );

        DATA.anneesRestantes =

            DATA.epargneAnnuelle > 0

            ?

            DATA.restant250k
            /
            DATA.epargneAnnuelle

            :

            0;

        DATA.projectionAnnee =

            new Date().getFullYear()

            +

            Math.ceil(
                DATA.anneesRestantes
            );

        /* ========================================== */
        /* NOUVEAUX KPI                               */
        /* ========================================== */

        // Taux d'épargne exact
        DATA.tauxEpargneExact = revenusAnnuels > 0 ?
            ((revenusAnnuels - depensesAnnuelles) / revenusAnnuels) * 100 : 0;

        // Mois de couverture (cash / dépenses mensuelles)
        const depensesMensuelles = depensesAnnuelles / 12;
        DATA.moisCouverture = depensesMensuelles > 0 ?
            (DATA.budget.cash_dispo_total || 0) / depensesMensuelles : 0;

        // Exposition investissements
        DATA.expositionInvestissements = DATA.patrimoine > 0 ?
            ((DATA.budget.investissements_total || 0) / DATA.patrimoine) * 100 : 0;

        console.log("Nouveaux KPI calculés:", {
            tauxEpargneExact: DATA.tauxEpargneExact.toFixed(1) + "%",
            moisCouverture: DATA.moisCouverture.toFixed(1),
            expositionInvestissements: DATA.expositionInvestissements.toFixed(1) + "%"
        });

        /* ========================================== */
        /* KPI PRINCIPAUX                             */
        /* ========================================== */

        animerValeur(
            DOM.networth,
            DATA.patrimoine,
            " €"
        );

        animerValeur(
            DOM.cash,
            DATA.budget.cash_dispo_total || 0,
            " €"
        );

        animerValeur(
            DOM.investments,
            DATA.budget.investissements_total || 0,
            " €"
        );

        animerValeur(
            DOM.pea,
            DATA.pea.pea_valeur || 0,
            " €"
        );

        animerValeur(
            DOM.cto,
            DATA.ctoValeurEUR,
            " €"
        );

        if (DOM.performance) {

            DOM.performance.textContent =

                (
                    (DATA.budget.taux_epargne_annuel || 0)
                    * 100
                ).toFixed(0)

                +

                " %";

        }
        /* ================================================== */
        /* SECTION : RESUME                                   */
        /* ================================================== */

        if (DOM.summaryNetworth) {

            DOM.summaryNetworth.textContent =
                formatEUR(
                    DATA.patrimoine
                );

        }

        if (DOM.summaryProgress) {

            DOM.summaryProgress.textContent =
                formatPourcentage(
                    DATA.progression250k
                );

        }

        if (DOM.summaryRemaining) {

            DOM.summaryRemaining.textContent =
                formatEUR(
                    DATA.restant250k
                );

        }

        /* ================================================== */
        /* SECTION : KPI AVANCES                              */
        /* ================================================== */

        if (DOM.totalGain) {

            DOM.totalGain.textContent =

                DATA.plusValueTotale
                    .toLocaleString(
                        "fr-FR",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    )

                +

                " €";

        }

        if (DOM.globalPerformance) {

            DOM.globalPerformance.textContent =

                formatPourcentage(
                    DATA.performanceGlobale
                );

        }

        if (DOM.capitalInvesti) {

            DOM.capitalInvesti.textContent =

                formatEUR(
                    DATA.capitalInvesti
                );

        }

        if (DOM.ratioInvesti) {

            DOM.ratioInvesti.textContent =

                formatPourcentage(
                    DATA.ratioInvesti
                );

        }

        /* ================================================== */
        /* SECTION : PROJECTION FIRE                          */
        /* ================================================== */

        if (DOM.projectionDate) {

            DOM.projectionDate.innerHTML =

                DATA.projectionAnnee

                +

                "<br><small>"

                +

                DATA.anneesRestantes
                    .toFixed(1)

                +

                " ans</small>";

        }

        /* ================================================== */
        /* SECTION : FIRE TRACKER                             */
        /* ================================================== */

        if (DOM.fireProgress) {

            DOM.fireProgress.textContent =

                DATA.progression250k
                    .toFixed(1)

                +

                " %";

        }

        if (DOM.mainGoalProgress) {

            DOM.mainGoalProgress.textContent =

                "🎯 "

                +

                DATA.progression250k
                    .toFixed(1)

                +

                "% vers 250k";

        }

        if (DOM.fireDetails) {

            DOM.fireDetails.innerHTML =

                "Patrimoine : "

                +

                formatEUR(
                    DATA.patrimoine
                )

                +

                "<br>"

                +

                "Objectif : "

                +

                formatEUR(
                    DATA.objectif250k
                )

                +

                "<br>"

                +

                "Progression : "

                +

                DATA.progression250k
                    .toFixed(1)

                +

                " %"

                +

                "<br>"

                +

                "Reste : "

                +

                formatEUR(
                    DATA.restant250k
                )

                +

                "<br>"

                +

                "Épargne annuelle : "

                +

                formatEUR(
                    DATA.epargneAnnuelle
                )

                +

                "<br>"

                +

                "Projection : "

                +

                DATA.projectionAnnee

                +

                " (~"

                +

                DATA.anneesRestantes
                    .toFixed(1)

                +

                " ans)";

        }

        if (DOM.fireBar) {

            DOM.fireBar.style.width =

                Math.min(
                    DATA.progression250k,
                    100
                )

                +

                "%";

        }

        /* ================================================== */
        /* SECTION : SYNCHRONISATION                          */
        /* ================================================== */

        if (DOM.lastUpdate) {

            DOM.lastUpdate.textContent =

                "Dernière synchronisation : "

                +

                new Date()
                    .toLocaleString(
                        "fr-FR"
                    );

        }

        console.log(
            "Calculs financiers OK ✅"
        );
        /* ================================================== */
        /* SECTION : CHART ALLOCATION                         */
        /* ================================================== */

        if (
            typeof updateAllocationChart ===
            "function"
        ) {

            updateAllocationChart(

                DATA.budget.cash_dispo_total || 0,

                DATA.pea.pea_valeur || 0,

                DATA.ctoValeurEUR || 0

            );

        }

        /* ================================================== */
        /* SECTION : CHART EVOLUTION                          */
        /* ================================================== */

        const labels = [];
        const valeurs = [];

        if (evolutionResponse) {
            const evolutionCsv = await evolutionResponse.text();
            const lignesEvolution = evolutionCsv.replace(/\r/g, "").trim().split("\n");

            for (let i = 1; i < lignesEvolution.length; i++) {
                const colonnes = lignesEvolution[i].split(",");
                if (colonnes.length < 2) continue;
                labels.push(colonnes[0].trim());
                valeurs.push(nettoyerNombre(colonnes[1]));
            }
        }

        if (
            typeof updatePatrimoineChart ===
            "function"
        ) {

            updatePatrimoineChart(
                labels,
                valeurs
            );

        }

        console.log(
            "Graphiques OK ✅"
        );

        /* ================================================== */
        /* SECTION : OBJECTIFS                                */
        /* ================================================== */

        if (objectifResponse) {
            const objectifCsv = await objectifResponse.text();
            const lignesObjectifs = objectifCsv.replace(/\r/g, "").trim().split("\n");

            for (let i = 1; i < lignesObjectifs.length; i++) {
                const colonnes = lignesObjectifs[i].split(",");
                if (colonnes.length < 3) continue;

                const objectif = colonnes[0].trim();
                const cible = nettoyerNombre(colonnes[1]);
                const actuel = nettoyerNombre(colonnes[2]);

                if (cible <= 0) continue;

                const pourcentage = (actuel / cible) * 100;
                const label = document.getElementById("goal-" + objectif);
                const barre = document.getElementById("bar-" + objectif);

                if (label) {
                    label.textContent = `${Math.round(actuel).toLocaleString("fr-FR")} € / ${Math.round(cible).toLocaleString("fr-FR")} € (${pourcentage.toFixed(1)}%)`;
                }

                if (barre) {
                    barre.style.width = `${Math.min(pourcentage, 100)}%`;

                    if (pourcentage < 25) {
                        barre.style.background = "#ef4444";
                    } else if (pourcentage < 50) {
                        barre.style.background = "#f59e0b";
                    } else if (pourcentage < 75) {
                        barre.style.background = "#3b82f6";
                    } else {
                        barre.style.background = "#22c55e";
                    }
                }
            }
        }

        console.log(
            "Objectifs OK ✅"
        );

        /* ================================================== */
        /* SECTION : THEME                                    */
        /* ================================================== */

        const themeButton =
            document.getElementById(
                "themeToggle"
            );

        if (themeButton) {

            if (
                localStorage.getItem(
                    "theme"
                ) === "light"
            ) {

                document.body.classList.add(
                    "light"
                );

                themeButton.textContent =
                    "☀️";

            }

            themeButton.addEventListener(
                "click",
                () => {

                    document.body.classList.toggle(
                        "light"
                    );

                    const isLight =

                        document.body.classList.contains(
                            "light"
                        );

                    themeButton.textContent =

                        isLight
                        ? "☀️"
                        : "🌙";

                    localStorage.setItem(

                        "theme",

                        isLight
                        ? "light"
                        : "dark"

                    );

                    // Refresh charts au changement de thème
                    if (typeof window.refreshCharts === "function") {
                        window.refreshCharts();
                    }

                }
            );

        }

        console.log(
            "Dashboard V5 chargé ✅"
        );

    }
    catch (error) {

        console.error(
            "Erreur Dashboard :",
            error
        );

        showAlert(`❌ Erreur lors du chargement du dashboard: ${error.message}`, "error");

    }

}

/* ================================================== */
/* INITIALISATION                                     */
/* ================================================== */

document.addEventListener(
    "DOMContentLoaded",
    chargerDashboard
);
