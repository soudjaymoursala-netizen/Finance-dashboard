const URL_BUDGET =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vSq5EMGQYPvA9CZrUkdteiVl09VLnBQyHK6mQQJwzPkf0xTJO1Igb8YnelcKpnt-X9U84QcQsSsjR5U/pub?gid=519498006&single=true&output=csv";

const URL_CTO =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRua8tbeOUeO8TYpCthF1iXVQsxqmexyi-HvitZFz9i-SySYqUHOfI-58ugboXfgh_5n3YTWmtwQO_c/pub?gid=1361663202&single=true&output=csv";

const URL_PEA =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQf31wN50iBv_V-YVhgc1qsmxvuPYXOZvPGrwYQyMcZ8NIbMRVNf59CjmiBr-CjRgL3OVORVFGAWe_s/pub?gid=1971681206&single=true&output=csv";

const URL_EVOLUTION =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vSq5EMGQYPvA9CZrUkdteiVl09VLnBQyHK6mQQJwzPkf0xTJO1Igb8YnelcKpnt-X9U84QcQsSsjR5U/pub?gid=810332816&single=true&output=csv";

const URL_OBJECTIF =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vSq5EMGQYPvA9CZrUkdteiVl09VLnBQyHK6mQQJwzPkf0xTJO1Igb8YnelcKpnt-X9U84QcQsSsjR5U/pub?gid=1700667008&single=true&output=csv";

// ===== AFFICHAGE DES ERREURS À L'ÉCRAN =====
function afficherErreur(message) {
    console.error("❌ Erreur Dashboard :", message);
    
    const container = document.getElementById("error-display");
    if (container) {
        container.style.display = "block";
        container.textContent = "⚠️ " + message;
    }
}

function afficherDebug(message) {
    console.log("🔍 DEBUG:", message);
    
    const container = document.getElementById("debug-display");
    if (container) {
        container.textContent = "ℹ️ " + message;
    }
}

// Créer les conteneurs d'affichage au chargement
function creerConteneurErreur() {
    if (!document.getElementById("error-display")) {
        const errDiv = document.createElement("div");
        errDiv.id = "error-display";
        errDiv.style.cssText = `
            display: none;
            position: fixed;
            top: 80px;
            left: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            word-wrap: break-word;
        `;
        document.body.appendChild(errDiv);
    }
    
    if (!document.getElementById("debug-display")) {
        const debugDiv = document.createElement("div");
        debugDiv.id = "debug-display";
        debugDiv.style.cssText = `
            display: block;
            position: fixed;
            top: 140px;
            left: 20px;
            right: 20px;
            background: #0066cc;
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            word-wrap: break-word;
        `;
        debugDiv.textContent = "ℹ️ Chargement des données...";
        document.body.appendChild(debugDiv);
    }
}

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

        const colonnes =
            lignes[i]
                .replace(/\r/g, "")
                .split("\t");

        if (colonnes.length < 2) continue;

        resultat[colonnes[0].trim()] =
            nettoyerNombre(colonnes[1]);
    }

    return resultat;
}

async function chargerDashboard() {

    try {
        creerConteneurErreur();
        afficherDebug("🔄 Récupération des données...");

        afficherDebug("📊 Fetching Budget...");
        const budgetResponse = await fetch(URL_BUDGET);
        if (!budgetResponse.ok) throw new Error("Budget: HTTP " + budgetResponse.status);
        
        afficherDebug("📊 Fetching CTO...");
        const ctoResponse = await fetch(URL_CTO);
        if (!ctoResponse.ok) throw new Error("CTO: HTTP " + ctoResponse.status);
        
        afficherDebug("📊 Fetching PEA...");
        const peaResponse = await fetch(URL_PEA);
        if (!peaResponse.ok) throw new Error("PEA: HTTP " + peaResponse.status);
        
        afficherDebug("📊 Fetching Evolution...");
        const evolutionResponse = await fetch(URL_EVOLUTION);
        if (!evolutionResponse.ok) throw new Error("Evolution: HTTP " + evolutionResponse.status);
        
        afficherDebug("📊 Fetching Objectifs...");
        const objectifResponse = await fetch(URL_OBJECTIF);
        if (!objectifResponse.ok) throw new Error("Objectifs: HTTP " + objectifResponse.status);

        const budget =
            lireCSVKPI(await budgetResponse.text());

        const cto =
            lireCSVKPI(await ctoResponse.text());

        const pea =
            lireCSVKPI(await peaResponse.text());

        afficherDebug("✅ Données reçues! Traitement...");

        const ctoEuro =
            (cto.cto_valeur_chf || 0) *
            (cto.eur_chf || 1);

        document.getElementById("networth").textContent =
            Math.round(budget.patrimoine_total || 0)
                .toLocaleString("fr-FR") + " €";

        document.getElementById("cash").textContent =
            Math.round(budget.cash_dispo_total || 0)
                .toLocaleString("fr-FR") + " €";

        document.getElementById("investments").textContent =
            Math.round(budget.investissements_total || 0)
                .toLocaleString("fr-FR") + " €";

        document.getElementById("pea").textContent =
            Math.round(pea.pea_valeur || 0)
                .toLocaleString("fr-FR") + " €";

        document.getElementById("cto").textContent =
            Math.round(ctoEuro || 0)
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

        const evolutionCsv =
            await evolutionResponse.text();

        const lignesEvolution =
            evolutionCsv.trim().split("\n");

        const labels = [];
        const valeurs = [];

        for (let i = 1; i < lignesEvolution.length; i++) {

            const colonnes =
                lignesEvolution[i]
                    .replace(/\r/g, "")
                    .split("\t");

            if (colonnes.length < 2) continue;

            labels.push(colonnes[0]);

            valeurs.push(
                nettoyerNombre(colonnes[1])
            );
        }

        if (typeof updatePatrimoineChart === "function") {

            updatePatrimoineChart(
                labels,
                valeurs
            );
        }

        // ===== TRAITEMENT DES OBJECTIFS =====
        const objectifCsv = await objectifResponse.text();
        const lignesObjectif = objectifCsv.trim().split("\n");

        for (let i = 1; i < lignesObjectif.length; i++) {

            const colonnes = lignesObjectif[i]
                .replace(/\r/g, "")
                .split("\t");

            if (colonnes.length < 3) continue;

            const nom = colonnes[0].trim().toLowerCase();
            const actuel = nettoyerNombre(colonnes[1]);
            const objectif = nettoyerNombre(colonnes[2]);

            if (objectif > 0) {
                const pourcentage = Math.min(100, (actuel / objectif) * 100);

                // Mise à jour de la barre de progression
                const barElement = document.getElementById(`bar-${nom}`);
                if (barElement) {
                    barElement.style.width = pourcentage + "%";
                }

                // Mise à jour du pourcentage affiché
                const goalElement = document.getElementById(`goal-${nom}`);
                if (goalElement) {
                    goalElement.textContent = Math.round(pourcentage) + "%";
                }

                console.log(`Objectif ${nom}: ${Math.round(pourcentage)}%`);
            }
        }

        afficherDebug("✅ Dashboard chargé avec succès!");
        setTimeout(() => {
            const debugDiv = document.getElementById("debug-display");
            if (debugDiv) debugDiv.style.display = "none";
        }, 3000);

    } catch (error) {

        afficherErreur("Erreur: " + error.message);
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
