const URL_BUDGET =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=519498006&single=true&output=csv";

const URL_CTO =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRua8tbeOUeO8TYpCthF1iXVQsxqmexyi-HvitZFz9i-SySYqUHOfI-58ugboXfgh_5n3YTWmtwQO_c/pub?gid=1361663202&single=true&output=csv";

const URL_PEA =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQf31wN50iBv_V-YVhgc1qsmxvuPYXOZvPGrwYQyMcZ8NIbMRVNf59CjmiBr-CjRgL3OVORVFGAWe_s/pub?gid=1971681206&single=true&output=csv";

function lireCSV(csv) {

    const lignes = csv.trim().split("\n");
    const data = {};

    for(let i = 1; i < lignes.length; i++) {

        const ligne = lignes[i];

        const indexVirgule = ligne.indexOf(",");

        const cle = ligne.substring(0, indexVirgule);

        let valeur = ligne.substring(indexVirgule + 1);

        valeur = valeur
            .replace(/"/g, "")
            .replace(/\s/g, "")
            .replace(",", ".");

        data[cle] = Number(valeur);
    }

    return data;
}

async function chargerDashboard() {

    try {

        const [budgetRes, ctoRes, peaRes] = await Promise.all([
            fetch(URL_BUDGET),
            fetch(URL_CTO),
            fetch(URL_PEA)
        ]);

        const budget = lireCSV(await budgetRes.text());
        const cto = lireCSV(await ctoRes.text());
        const pea = lireCSV(await peaRes.text());

        const ctoEur =
            cto.cto_valeur_chf *
            cto.eur_chf;

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
            Math.round(ctoEur)
            .toLocaleString("fr-FR") + " €";

        document.getElementById("performance").textContent =
            (budget.taux_epargne_annuel * 100)
            .toFixed(1) + " %";

        console.log("Dashboard chargé", {
            budget,
            cto,
            pea
        });

    }

    catch(error) {

        console.error(error);

    }

}

document.addEventListener(
    "DOMContentLoaded",
    chargerDashboard
);
