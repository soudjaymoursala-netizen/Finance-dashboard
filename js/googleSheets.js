const URL_BUDGET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=519498006&single=true&output=csv";

async function chargerBudget() {

    try {

        const response = await fetch(URL_BUDGET);
        const csv = await response.text();

        const lignes = csv.trim().split("\n");

        const donnees = {};

        for (let i = 1; i < lignes.length; i++) {

            const ligne = lignes[i];

            const premiereVirgule = ligne.indexOf(",");

            const cle = ligne.substring(0, premiereVirgule);

            let valeur = ligne.substring(premiereVirgule + 1);

            valeur = valeur.replace(/"/g, "");
            valeur = valeur.replace(",", ".");

            donnees[cle] = parseFloat(valeur);
        }

        alert(JSON.stringify(donnees));

    }

    catch(error) {

        alert("ERREUR : " + error);

    }

}

document.addEventListener("DOMContentLoaded", chargerBudget);
