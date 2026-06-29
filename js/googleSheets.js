function nettoyerNombre(valeur) {

    if (!valeur) return 0;

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

function lireCSVKPI(csv) {

    const lignes = csv
        .replace(/\r/g, "")
        .trim()
        .split("\n");

    const resultat = {};

    for (let i = 1; i < lignes.length; i++) {

        const ligne = lignes[i];

        const indexVirgule =
            ligne.indexOf(",");

        if (indexVirgule === -1)
            continue;

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
            nettoyerNombre(valeur);
    }

    return resultat;
}

function animerValeur(
    element,
    valeurFinale,
    suffixe = ""
) {

    if (!element) return;

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
                + suffixe;

        }, pas);
}

async function chargerDashboard() {

    try {

        const [
            budgetResponse,
            ctoResponse,
            peaResponse,
            evolutionResponse,
            objectifResponse
        ] = await Promise.all([

            fetch(CONFIG.URL_BUDGET),
            fetch(CONFIG.URL_CTO),
            fetch(CONFIG.URL_PEA),
            fetch(CONFIG.URL_EVOLUTION),
            fetch(CONFIG.URL_OBJECTIF)

        ]);

        const budget =
            lireCSVKPI(
                await budgetResponse.text()
            );

        const cto =
            lireCSVKPI(
                await ctoResponse.text()
            );

        const pea =
            lireCSVKPI(
                await peaResponse.text()
            );

        const ctoEuro =
            (cto.cto_valeur_chf || 0)
            *
            (cto.eur_chf || 1);

        const patrimoine =
            budget.patrimoine_total || 0;

        const objectif250k =
            250000;

        const progression250k =
            patrimoine /
            objectif250k *
            100;

        const restant250k =
            objectif250k -
            patrimoine;

        // ==========================
        // V5 KPI
        // ==========================

        const peaPlusValue =
            pea.pea_plusvalue || 0;

        const ctoPlusValue =
            (cto.cto_plusvalue_chf || 0)
            *
            (cto.eur_chf || 1);

        const plusValueTotale =
            peaPlusValue +
            ctoPlusValue;

        const capitalInvesti =
            (pea.pea_investi || 0)
            +
            (
                (cto.cto_investi_chf || 0)
                *
                (cto.eur_chf || 1)
            );

        const performanceGlobale =
            capitalInvesti > 0
                ? (
                    plusValueTotale /
                    capitalInvesti
                ) * 100
                : 0;

        const ratioInvesti =
            patrimoine > 0
                ? (
                    (
                        budget.investissements_total || 0
                    ) /
                    patrimoine
                ) * 100
                : 0;
        
      // ==========================
      //  Projection basée sur l'évolution réelle du patrimoine
      // ==========================
        
let progressionMensuelle = 0;

if (valeurs.length >= 2) {

    const premierPatrimoine =
        valeurs[0];

    const dernierPatrimoine =
        valeurs[valeurs.length - 1];

    const nombreMois =
        valeurs.length - 1;

    progressionMensuelle =
        (dernierPatrimoine - premierPatrimoine)
        /
        nombreMois;
}

const moisRestants =
    progressionMensuelle > 0
        ? restant250k / progressionMensuelle
        : 0;

const anneesRestantes =
    moisRestants / 12;

const dateProjection =
    new Date();

dateProjection.setMonth(
    dateProjection.getMonth()
    +
    Math.round(moisRestants)
);

        // ==========================
        // KPI PRINCIPAUX
        // ==========================

        animerValeur(
            document.getElementById(
                "networth"
            ),
            patrimoine,
            " €"
        );

        animerValeur(
            document.getElementById(
                "cash"
            ),
            budget.cash_dispo_total || 0,
            " €"
        );

        animerValeur(
            document.getElementById(
                "investments"
            ),
            budget.investissements_total || 0,
            " €"
        );

        animerValeur(
            document.getElementById(
                "pea"
            ),
            pea.pea_valeur || 0,
            " €"
        );

        animerValeur(
            document.getElementById(
                "cto"
            ),
            ctoEuro || 0,
            " €"
        );

        document.getElementById(
            "performance"
        ).textContent =
            (
                (budget.taux_epargne_annuel || 0)
                * 100
            ).toFixed(0)
            + " %";

        // ==========================
        // RESUME
        // ==========================

        const summaryNetworth =
            document.getElementById(
                "summaryNetworth"
            );

        const summaryProgress =
            document.getElementById(
                "summaryProgress"
            );

        const summaryRemaining =
            document.getElementById(
                "summaryRemaining"
            );

        if (summaryNetworth) {

            summaryNetworth.textContent =
                patrimoine
                    .toLocaleString(
                        "fr-FR"
                    ) + " €";
        }

        if (summaryProgress) {

            summaryProgress.textContent =
                progression250k
                    .toFixed(1)
                + " %";
        }

        if (summaryRemaining) {

            summaryRemaining.textContent =
                restant250k
                    .toLocaleString(
                        "fr-FR"
                    )
                + " €";
        }

        // ==========================
        // KPI V5
        // ==========================

        const totalGain =
            document.getElementById(
                "totalGain"
            );

        const globalPerformance =
            document.getElementById(
                "globalPerformance"
            );

        const capitalInvestiElement =
            document.getElementById(
                "capitalInvesti"
            );

        const ratioInvestiElement =
            document.getElementById(
                "ratioInvesti"
            );

        const projectionDate =
            document.getElementById(
                "projectionDate"
            );

        if (totalGain) {

            totalGain.textContent =
                plusValueTotale
                    .toLocaleString(
                        "fr-FR"
                    )
                + " €";
        }

        if (globalPerformance) {

            globalPerformance.textContent =
                performanceGlobale
                    .toFixed(1)
                + " %";
        }

        if (capitalInvestiElement) {

            capitalInvestiElement.textContent =
                capitalInvesti
                    .toLocaleString(
                        "fr-FR"
                    )
                + " €";
        }

        if (ratioInvestiElement) {

            ratioInvestiElement.textContent =
                ratioInvesti
                    .toFixed(1)
                + " %";
        }

if (projectionDate) {

    const mois = [
        "Jan",
        "Fév",
        "Mar",
        "Avr",
        "Mai",
        "Jun",
        "Jul",
        "Aoû",
        "Sep",
        "Oct",
        "Nov",
        "Déc"
    ];

    projectionDate.innerHTML =

        mois[
            dateProjection.getMonth()
        ]

        +

        " "

        +

        dateProjection.getFullYear()

        +

        "<br><small>"

        +

        anneesRestantes.toFixed(1)

        +

        " ans</small>";
}

        // ==========================
        // FIRE TRACKER
        // ==========================

        const fireProgress =
            document.getElementById(
                "fireProgress"
            );

        const fireDetails =
            document.getElementById(
                "fireDetails"
            );

        const fireBar =
            document.getElementById(
                "fireBar"
            );

        const mainGoalProgress =
            document.getElementById(
                "mainGoalProgress"
            );

        if (fireProgress) {

            fireProgress.textContent =
                progression250k
                    .toFixed(1)
                + " %";
        }

        if (mainGoalProgress) {

            mainGoalProgress.textContent =
                "🎯 "
                +
                progression250k.toFixed(
                    1
                )
                +
                "% vers 250k";
        }

        if (fireDetails) {

            fireDetails.innerHTML =

                "Patrimoine : "
                +

                patrimoine.toLocaleString(
                    "fr-FR"
                )

                +

                " €<br>"

                +

                "Objectif : 250 000 €<br>"

                +

                "Reste : "

                +

                restant250k.toLocaleString(
                    "fr-FR"
                )

                +

                " €";
        }

        if (fireBar) {

            fireBar.style.width =
                Math.min(
                    progression250k,
                    100
                )
                + "%";
        }

        // ==========================
        // DATE SYNCHRO
        // ==========================

        const updateElement =
            document.getElementById(
                "lastUpdate"
            );

        if (updateElement) {

            updateElement.textContent =
                "Dernière synchronisation : "
                +
                new Date()
                    .toLocaleString(
                        "fr-FR"
                    );
        }

        // ==========================
        // DONUT
        // ==========================

        if (
            typeof updateAllocationChart ===
            "function"
        ) {

            updateAllocationChart(
                budget.cash_dispo_total || 0,
                pea.pea_valeur || 0,
                ctoEuro || 0
            );
        }

        // ==========================
        // EVOLUTION
        // ==========================

        const evolutionCsv =
            await evolutionResponse.text();

        const lignesEvolution =
            evolutionCsv
                .replace(/\r/g, "")
                .trim()
                .split("\n");

        const labels = [];
        const valeurs = [];

        for (
            let i = 1;
            i < lignesEvolution.length;
            i++
        ) {

            const colonnes =
                lignesEvolution[i]
                    .split(",");

            if (
                colonnes.length < 2
            )
                continue;

            labels.push(
                colonnes[0].trim()
            );

            valeurs.push(
                nettoyerNombre(
                    colonnes[1]
                )
            );
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

        // ==========================
        // OBJECTIFS
        // ==========================

        const objectifCsv =
            await objectifResponse.text();

        const lignesObjectifs =
            objectifCsv
                .replace(/\r/g, "")
                .trim()
                .split("\n");

        for (
            let i = 1;
            i < lignesObjectifs.length;
            i++
        ) {

            const colonnes =
                lignesObjectifs[i]
                    .split(",");

            if (
                colonnes.length < 3
            )
                continue;

            const objectif =
                colonnes[0].trim();

            const cible =
                nettoyerNombre(
                    colonnes[1]
                );

            const actuel =
                nettoyerNombre(
                    colonnes[2]
                );

            if (cible <= 0)
                continue;

            const pourcentage =
                (actuel / cible)
                * 100;

            const label =
                document.getElementById(
                    "goal-" + objectif
                );

            const barre =
                document.getElementById(
                    "bar-" + objectif
                );

            if (label) {

                label.textContent =
                    `${Math.round(actuel).toLocaleString("fr-FR")} € / ${Math.round(cible).toLocaleString("fr-FR")} € (${pourcentage.toFixed(1)}%)`;
            }

            if (barre) {

                barre.style.width =
                    `${Math.min(
                        pourcentage,
                        100
                    )}%`;

                if (
                    pourcentage < 25
                ) {

                    barre.style.background =
                        "#ef4444";

                } else if (
                    pourcentage < 50
                ) {

                    barre.style.background =
                        "#f59e0b";

                } else if (
                    pourcentage < 75
                ) {

                    barre.style.background =
                        "#3b82f6";

                } else {

                    barre.style.background =
                        "#22c55e";
                }
            }
        }

        console.log(
            "Dashboard V5 chargé ✅"
        );

    } catch (error) {

        console.error(
            "Erreur Dashboard :",
            error
        );
    }
}

document.addEventListener(
    "DOMContentLoaded",
    chargerDashboard
);
