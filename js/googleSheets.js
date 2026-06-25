const URL_BUDGET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=519498006&single=true&output=csv";

async function chargerBudget() {

    try {

        const response = await fetch(URL_BUDGET);

        const csv = await response.text();

        alert(csv.substring(0, 300));

    }

    catch(error) {

        alert("Erreur : " + error);

    }

}

chargerBudget();
