const URL_BUDGET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=519498006&single=true&output=csv";

async function chargerBudget() {

    try {

        const response = await fetch(URL_BUDGET);
        const csv = await response.text();

        const lignes = csv.split("\n");

        const donnees = {};

        for (let i = 1; i < lignes.length; i++) {

            const ligne = lignes[i].trim();

            if (!ligne) continue;

            const premiereVirgule = ligne.indexOf(",");

            const cle = ligne.substring(0, premiereVirgule);

            let valeur = ligne.substring(premiereVirgule + 1);

            valeur = valeur
                .replace(/"/g, "")
                .replace(/â€¯/g, "")
                .replace(/\s/g, "")
                .replace(",", ".");

            donnees[cle] = parseFloat(valeur) || 0;
        }

        document.getElementById("networth").innerText =
            Math.round(donnees.patrimoine_total).toLocaleString("fr-FR") + " €";

        document.getElementById("cash").innerText =
            Math.round(donnees.cash_dispo_total).toLocaleString("fr-FR") + " €";

        document.getElementById("investments").innerText =
            Math.round(donnees.investissements_total).toLocaleString("fr-FR") + " €";

        document.getElementById("performance").innerText =
            (donnees.taux_epargne_annuel * 100).toFixed(1) + " %";

        console.log(donnees);

    }

    catch(error) {

        alert("Erreur : " + error);

        console.error(error);

    }

}

chargerBudget();
