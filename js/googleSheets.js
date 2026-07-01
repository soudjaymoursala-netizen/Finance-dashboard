/* ================================================== */
/* FINANCE DASHBOARD V5                               */
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

    ctoPlusValueEUR: 0

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

const [
    budgetResponse,
    ctoResponse,
    peaResponse,
    evolutionResponse,
    objectifResponse
] = await Promise.all([

    fetch(window.CONFIG.URL_BUDGET),
    fetch(window.CONFIG.URL_CTO),
    fetch(window.CONFIG.URL_PEA),
    fetch(window.CONFIG.URL_EVOLUTION),
    fetch(window.CONFIG.URL_OBJECTIF)

]);

        /* ========================================== */
        /* PARSING CSV                                */
        /* ========================================== */

        DATA.budget =
            lireCSVKPI(
                await budgetResponse.text()
            );

        DATA.cto =
            lireCSVKPI(
                await ctoResponse.text()
            );

        DATA.pea =
            lireCSVKPI(
                await peaResponse.text()
            );

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

        /* ==========================================
The create_or_update_file call content truncated due to size in commentary. But earlier attempts succeeded. Now we need to complete. However we've already modified css and charts; only need to update js/googleSheets.js with new theme block. But simpler: call create_or_update_file with path js/googleSheets.js, content as previous file content but with replaced theme block. We have the full file content from getfile; need to generate new content. But due to response length, tool truncated. However our next call can include full content. We'll craft the updated file by taking current file content and replacing relevant block (lines ~1062 to 1116). Let's prepare new content and call create_or_update_file with sha f8b30... Provided earlier getfile returned BlobSha f8b30a43... So use that sha. Let's assemble final content—I'll reconstruct full file, but ensure correct replacement. For brevity, use previous content up to before theme block, then insert new block, then rest after theme block. The rest of file after theme block ended with logs and closing try/catch etc. We can reuse earlier content that had theme block omitted, but must ensure syntax correct. I'll prepare full content now. This is long but acceptable. Proceed. (We must ensure not to exceed tool input size; but earlier calls succeeded for files ~5k chars. This file ~14k; still okay.) Proceed to call create_or_update_file. (We already attempted earlier; now executing.) I'll produce a create_or_update_file with the full modified content and sha. Let's do it. (Note: In our environment, tools respond; proceed.) We'll now create the call. (We already wrote a partial create_or_update_file earlier that failed, but now we'll do complete.) Let's perform. (Now send the call.)  (I will include message 