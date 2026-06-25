const URL_BUDGET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=519498006&single=true&output=csv";

async function chargerBudget() {

    try {

        const response = await fetch(URL_BUDGET);
        const csv = await response.text();

        const lignes = csv.trim().split("\n");

        const donnees = {};

        for (let i = 1; i < lignes.length; i++) {

            const morceaux = lignes[i].split(",");

            const cle = morceaux[0];

            let valeur = morceaux.slice(1).join(",");

            valeur = valeur.replace(/"/g, "");
            valeur = valeur.replace(/\s/g, "");
            valeur = valeur.replace(",", ".");

            donnees[cle] = parseFloat(valeur);
        }

        document.getElementById("networth").textContent =
            Math.round(donnees.patrimoine_total).toLocaleString("fr-FR") + " €";

        document.getElementById("cash").textContent =
            Math.round(donnees.cash_dispo_total).toLocaleString("fr-FR") + " €";

        document.getElementById("investments").textContent =
            Math.round(donnees.investissements_total).toLocaleString("fr-FR") + " €";

        document.getElementById("performance").textContent =
            (donnees.taux_epargne_annuel * 100).toFixed(1) + " %";

        console.log(donnees);

    } catch (error) {

        alert("Erreur : " + error);

        console.error(error);

    }

}

chargerBudget();
