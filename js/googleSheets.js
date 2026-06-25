const URL_BUDGET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=519498006&single=true&output=csv";

async function chargerBudget() {

    try {

        const response = await fetch(URL_BUDGET);
        const csv = await response.text();

        const lignes = csv.trim().split("\n");

        let resultat = "";

        for (let i = 0; i < lignes.length; i++) {
            resultat += lignes[i] + "\n";
        }

        alert(resultat);

    } catch (error) {

        alert("ERREUR : " + error.message);

    }
}

document.addEventListener("DOMContentLoaded", chargerBudget);
