const URL_BUDGET =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=519498006&single=true&output=csv";

const URL_CTO =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRua8tbeOUeO8TYpCthF1iXVQsxqmexyi-HvitZFz9i-SySYqUHOfI-58ugboXfgh_5n3YTWmtwQO_c/pub?gid=1361663202&single=true&output=csv";

const URL_PEA =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQf31wN50iBv_V-YVhgc1qsmxvuPYXOZvPGrwYQyMcZ8NIbMRVNf59CjmiBr-CjRgL3OVORVFGAWe_s/pub?gid=1971681206&single=true&output=csv";

const URL_EVOLUTION =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=810332816&single=true&output=csv";

const URL_OBJECTIF =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=1700667008&single=true&output=csv";

function nettoyerNombre(valeur) {

    if (!valeur) return 0;

    return parseFloat(
        valeur
            .toString()
            .replace(/"/g, "")
            .replace(/â€¯/g, "")
            .replace(/\u202F/g, "")
            .replace(/\u00A0/g, "")
            .replace(/\s/g, "")
            .replace(",", ".")
    ) || 0;
}

function lireCSVKPI(csv) {

    const lignes = csv.trim().split("\n");
    const resultat = {};

    for (let i = 1; i < lignes.length; i++) {

        const ligne = lignes[i];

        const indexVirgule = ligne.indexOf(",");

        if (indexVirgule === -1) continue;

        const cle = ligne.substring(0, indexVirgule);
        const valeur = ligne.substring(indexVirgule + 1);

        resultat[cle] = nettoyerNombre(valeur);
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
            fetch(URL_BUDGET),
            fetch(URL_CTO),
            fetch(URL_PEA),
            fetch(URL_EVOLUTION),
            fetch(URL_OBJECTIF)
        ]);

        const budget = lireCSVKPI(await budgetResponse.text());
        const cto = lireCSVKPI(await ctoResponse.text());
        const pea = lireCSVKPI(await peaResponse.text());

        const ctoEuro =
            (cto.cto_valeur_chf || 0) *
            (cto.eur_chf || 0);

        document.getElementById("networth").textContent =
            Math.round(budget.patrimoine_total)
                .toLocaleString("fr-FR") + " €";

        document.getElementById("cash").textContent =
            Math.round(budget.cash_dispo_total)
                .toLocaleString("fr-FR") + " €";

        document.getElementById("investments").textContent =
            Math.round(budget.investissements_total)
                .toLocaleString("fr-FR") + " €";

        document.getElementById("pea").textContent =
            Math.round(pea.pea_valeur)
                .toLocaleString("fr-FR") + " €";

        document.getElementById("cto").textContent =
            Math.round(ctoEuro)
                .toLocaleString("fr-FR") + " €";

        document.getElementById("performance").textContent =
            ((budget.taux_epargne_annuel || 0) * 100)
                .toFixed(1) + " %";

        if (typeof updateAllocationChart === "function") {

            updateAllocationChart(
                budget.cash_dispo_total || 0,
                pea.pea_valeur || 0,
                ctoEuro || 0
            );

        }

        const evolutionCsv = await evolutionResponse.text();
        const lignesEvolution = evolutionCsv.trim().split("\n");

        const labels = [];
        const valeurs = [];

        let derniereValeur = null;

        for (let i = 1; i < lignesEvolution.length; i++) {

            const morceaux = lignesEvolution[i].split(",");

            if (morceaux.length < 2) continue;

            const mois = morceaux[0];
            const valeur = nettoyerNombre(morceaux[1]);

            if (!valeur) continue;

            if (
                derniereValeur !== null &&
                valeur === derniereValeur
            ) {
                continue;
            }

            labels.push(mois);
            valeurs.push(valeur);

            derniereValeur = valeur;
        }

        if (typeof updatePatrimoineChart === "function") {
            updatePatrimoineChart(labels, valeurs);
        }

        const objectifCsv = await objectifResponse.text();

        const lignesObjectifs =
            objectifCsv.trim().split("\n");

        for (let i = 1; i < lignesObjectifs.length; i++) {

            const ligne = lignesObjectifs[i];

            const match =
                ligne.match(/^([^,]+),"([^"]+)","([^"]+)"/);

            if (!match) continue;

            const objectif = match[1].trim();
            const cible = nettoyerNombre(match[2]);
            const actuel = nettoyerNombre(match[3]);

            if (!cible) continue;

            const pourcentage =
                Math.min(
                    (actuel / cible) * 100,
                    100
                );

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
                    `${actuel.toLocaleString("fr-FR")} € / ${cible.toLocaleString("fr-FR")} € (${pourcentage.toFixed(1)}%)`;

            }

            if (barre) {

                barre.style.width =
                    pourcentage.toFixed(1) + "%";

            }
        }

        console.log("Dashboard chargé ✅");

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
