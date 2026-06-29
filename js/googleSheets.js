function nettoyerNombre(valeur) {

    if (!valeur) return 0;

    return parseFloat(
        valeur
            .toString()
            .imoineChart ===            .replace(/"/g, "")
            "function"
        ) {

            updatePatrimoineChart(
                labels,
                valeurs
            );

        }

        // OBJECTIFS

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
            ) continue;

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

                // Couleur dynamique

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
            "Dashboard chargé ✅"
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

        if (indexVirgule === -1) continue;

        const cle =
            ligne.substring(
                0,
                indexVirgule
            ).trim();

        const valeur =
            ligne.substring(
                indexVirgule + 1
            ).trim();

        resultat[cle] =
            nettoyerNombre(valeur);
    }

    return resultat;
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
            (cto.cto_valeur_chf || 0) *
            (cto.eur_chf || 1);

        // KPI

        document.getElementById(
            "networth"
        ).textContent =
            Math.round(
                budget.patrimoine_total || 0
            ).toLocaleString("fr-FR")
            + " €";

        document.getElementById(
            "cash"
        ).textContent =
            Math.round(
                budget.cash_dispo_total || 0
            ).toLocaleString("fr-FR")
            + " €";

        document.getElementById(
            "investments"
        ).textContent =
            Math.round(
                budget.investissements_total || 0
            ).toLocaleString("fr-FR")
            + " €";

        document.getElementById(
            "pea"
        ).textContent =
            Math.round(
                pea.pea_valeur || 0
            ).toLocaleString("fr-FR")
            + " €";

        document.getElementById(
            "cto"
        ).textContent =
            Math.round(
                ctoEuro || 0
            ).toLocaleString("fr-FR")
            + " €";

        document.getElementById(
            "performance"
        ).textContent =
            (
                (budget.taux_epargne_annuel || 0)
                * 100
            ).toFixed(0)
            + " %";

        // DONUT

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

        // EVOLUTION

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
            ) continue;

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
