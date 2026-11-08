/* ================================================== */
/* DEPENSES — insights en langage naturel              */
/* Optionnel (API_DEPENSES) : repose sur l'onglet       */
/* API_DEPENSES_CATEGORIES qui agrege deja cote Sheet   */
/* les donnees de 📊 Analyse & KPI (categories, conseils */
/* d'economie, projections d'objectifs) - ce fichier ne */
/* fait QUE les mettre en phrases, aucun calcul         */
/* financier n'est refait ici.                          */
/* ================================================== */

/* Les montants viennent deja formates du Sheet (ex: "€ 13 870",
   "24,8%") - on extrait juste la valeur numerique pour trier/comparer,
   en gardant le texte original pour l'affichage (deja au bon format). */
function nettoyerMontantTexte(str) {
    if (!str) return 0;
    const nettoye = str
        .toString()
        .replace(/"/g, "")
        .replace(/[€$]/g, "")
        .replace(/CHF/gi, "")
        .replace(/ /g, "")
        .replace(/ /g, "")
        .replace(/\s/g, "")
        .replace(",", ".");
    return parseFloat(nettoye) || 0;
}

function parseDepensesCsv(csv) {
    const sep = detectSeparator(csv);
    const lignes = csv.replace(/\r/g, "").trim().split("\n");
    const categories = [];
    const challenges = [];

    for (let i = 1; i < lignes.length; i++) {
        if (!lignes[i]) continue;
        const cols = splitCsvLine(lignes[i], sep);
        if (cols.length < 3) continue;

        const type = (cols[0] || "").trim();
        const nom = (cols[1] || "").trim();
        const valeurPrincipaleTexte = (cols[2] || "").trim();
        const valeurSecondaireTexte = (cols[3] || "").trim();
        const detail = cols.slice(4).join(sep).trim().replace(/^"|"$/g, "");

        if (type === "categorie") {
            categories.push({
                nom,
                totalAnneeTexte: valeurPrincipaleTexte,
                totalAnnee: nettoyerMontantTexte(valeurPrincipaleTexte),
                partPct: nettoyerMontantTexte(valeurSecondaireTexte),
                conseil: detail,
            });
        } else if (type === "challenge") {
            challenges.push({
                nom,
                manqueTexte: valeurPrincipaleTexte,
                manque: nettoyerMontantTexte(valeurPrincipaleTexte),
                aEpargnerMoisTexte: valeurSecondaireTexte,
                detail,
            });
        }
    }

    return { categories, challenges };
}

function echapperHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

function construireCartesInsights(categories, challenges) {
    const cartes = [];

    const triees = categories.slice().sort((a, b) => b.totalAnnee - a.totalAnnee);
    const plusGrosse = triees[0];

    if (plusGrosse) {
        cartes.push({
            icone: "flame",
            variant: "",
            titre: "Plus grosse dépense de l'année",
            texte:
                `Votre poste de dépense le plus important est <strong>${echapperHtml(plusGrosse.nom)}</strong> ` +
                `avec ${echapperHtml(plusGrosse.totalAnneeTexte)} (${plusGrosse.partPct.toFixed(1)}% de vos dépenses annuelles).`,
        });
    }

    categories
        .filter((c) => c.conseil)
        .forEach((c) => {
            cartes.push({
                icone: "wallet",
                variant: "emerald",
                titre: `Économiser sur ${c.nom}`,
                texte: echapperHtml(c.conseil),
            });
        });

    challenges
        .slice()
        .sort((a, b) => a.manque - b.manque)
        .forEach((ch) => {
            cartes.push({
                icone: "target",
                variant: "emerald",
                titre: `Challenge : ${ch.nom}`,
                texte:
                    `Il vous manque <strong>${echapperHtml(ch.manqueTexte)}</strong> pour atteindre cet objectif. ` +
                    echapperHtml(ch.detail),
            });
        });

    return cartes;
}

function renderDepensesInsights(categories, challenges) {
    const container = document.getElementById("depensesInsightsContainer");
    if (!container) return;

    const cartes = construireCartesInsights(categories, challenges);
    if (!cartes.length) {
        container.innerHTML = '<div class="insight-empty">Pas encore assez de données pour générer des conseils.</div>';
        return;
    }

    container.innerHTML = cartes
        .map(
            (carte) => `
        <div class="insight-card">
            <span class="icon-badge ${carte.variant}"><svg class="icon" width="16" height="16"><use href="#icon-${carte.icone}"></use></svg></span>
            <div class="insight-body">
                <div class="insight-title">${echapperHtml(carte.titre)}</div>
                <div class="insight-text">${carte.texte}</div>
            </div>
        </div>`
        )
        .join("");
}

async function chargerDepensesInsights() {
    try {
        const tabBtn = document.getElementById("budgetTabDepenses");
        if (!window.CONFIG.URL_DEPENSES) return;

        let csv = "";
        try {
            const r = await fetch(window.CONFIG.URL_DEPENSES);
            if (r.ok) csv = await r.text();
        } catch (fetchErr) {
            // silencieux : feature optionnelle, pas encore configuree
        }
        if (!csv) return;

        const { categories, challenges } = parseDepensesCsv(csv);
        if (!categories.length && !challenges.length) return;

        renderDepensesInsights(categories, challenges);
        // Revele l'onglet "Depenses" dans le module Budget (cf.
        // budgetTabs.js) - le panneau lui-meme reste gere par le systeme
        // d'onglets (classe .active), jamais par un style inline ici.
        if (tabBtn) tabBtn.style.display = "";
    } catch (e) {
        console.warn("Dépenses non disponibles:", e);
    }
}

window.chargerDepensesInsights = chargerDepensesInsights;
