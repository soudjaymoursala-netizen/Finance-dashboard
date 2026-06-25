const URL_BUDGET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=519498006&single=true&output=csv";

const URL_CTO = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRua8tbeOUeO8TYpCthF1iXVQsxqmexyi-HvitZFz9i-SySYqUHOfI-58ugboXfgh_5n3YTWmtwQO_c/pub?gid=1361663202&single=true&output=csv";

const URL_PEA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQf31wN50iBv_V-YVhgc1qsmxvuPYXOZvPGrwYQyMcZ8NIbMRVNf59CjmiBr-CjRgL3OVORVFGAWe_s/pub?gid=1971681206&single=true&output=csv";

function cleanNumber(value) {

    if (!value) return 0;

    return parseFloat(
        value
            .replace(/"/g, "")
            .replace(/â€¯/g, "")
            .replace(/\s/g, "")
            .replace(",", ".")
    ) || 0;
}

function parseCSV(text) {

    const lines = text.split("\n");
    const result = {};

    lines.slice(1).forEach(line => {

        const parts = line.split(",");

        if (parts.length >= 2) {

            const key = parts[0].trim();

            const value = parts.slice(1).join(",");

            result[key] = cleanNumber(value);
        }
    });

    return result;
}

async function loadDashboard() {

    const [budgetRes, ctoRes, peaRes] = await Promise.all([
        fetch(URL_BUDGET),
        fetch(URL_CTO),
        fetch(URL_PEA)
    ]);

    const budgetText = await budgetRes.text();
    const ctoText = await ctoRes.text();
    const peaText = await peaRes.text();

    const budget = parseCSV(budgetText);
    const cto = parseCSV(ctoText);
    const pea = parseCSV(peaText);

    const patrimoine =
        budget.patrimoine_total || 0;

    const cash =
        budget.cash_dispo_total || 0;

    const investissements =
        budget.investissements_total || 0;

    const peaValeur =
        pea.pea_valeur || 0;

    const ctoEur =
        (cto.cto_valeur_chf || 0) *
        (cto.eur_chf || 0);

    document.getElementById("networth").innerText =
        patrimoine.toLocaleString("fr-FR") + " €";

    document.getElementById("cash").innerText =
        cash.toLocaleString("fr-FR") + " €";

    document.getElementById("investments").innerText =
        investissements.toLocaleString("fr-FR") + " €";

    document.getElementById("performance").innerText =
        "PEA " +
        Math.round(peaValeur) +
        " €";

    console.log({
        budget,
        cto,
        pea,
        ctoEur
    });
}

loadDashboard();
