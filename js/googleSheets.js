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
    const lignesObjectifs = objectifCsv.trim().split("\n");

    for (let i = 1; i < lignesObjectifs.length; i++) {

        const morceaux = lignesObjectifs[i].split(",");

        if (morceaux.length < 3) continue;

        const objectif = morceaux[0].trim();

        const cible = nettoyerNombre(morceaux[1]);
        const actuel = nettoyerNombre(morceaux[2]);

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
                pourcentage.toFixed(1) + "%";

        }

        if (barre) {

            barre.style.width =
                pourcentage + "%";

        }
    }

    console.log("Dashboard chargé ✅");

}

catch (error) {

    console.error(
        "Erreur Dashboard :",
        error
    );

}
