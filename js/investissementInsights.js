/* ================================================== */
/* INVESTISSEMENT — insights en langage naturel         */
/* Purement calcule en JS a partir des positions deja   */
/* chargees par historiqueAchats.js                     */
/* (historiqueComptesGroupes) - aucun appel reseau       */
/* supplementaire, aucune donnee externe (news, API      */
/* tierce). Informatif uniquement (performance, risque  */
/* de concentration) - jamais de conseil d'achat/vente.  */
/*                                                        */
/* "Gain/perte" porte sur toute la periode suivie depuis */
/* l'achat (pas de notion "ce mois-ci" : les positions    */
/* sont des totaux cumules, sans historique de valeur     */
/* mois par mois pour chaque titre individuel).           */
/* ================================================== */

function echapperHtmlInvest(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

/* Convertit toutes les positions en euros (le CTO est en CHF) pour
   pouvoir comparer gains/pertes et poids entre PEA et CTO sur une
   base commune - reutilise le taux deja calcule ailleurs (DATA.cto.eur_chf). */
function construirePositionsAvecValeurEur() {
    const tauxEurChf = (window.DATA && window.DATA.cto && window.DATA.cto.eur_chf) || 1;
    const positions = [];
    Object.values(historiqueComptesGroupes || {}).forEach((compteData) => {
        Object.values(compteData.positions).forEach((pos) => {
            const enChf = pos.devise === "CHF";
            positions.push(
                Object.assign({}, pos, {
                    valeurEur: enChf ? pos.totalValeur * tauxEurChf : pos.totalValeur,
                    gainEur: enChf ? pos.totalGain * tauxEurChf : pos.totalGain,
                })
            );
        });
    });
    return positions;
}

function construireCartesInvestissement(positions) {
    const cartes = [];
    if (!positions.length) return cartes;

    const parGain = positions.slice().sort((a, b) => b.gainEur - a.gainEur);
    const meilleur = parGain[0];
    const pire = parGain[parGain.length - 1];

    if (meilleur && meilleur.gainEur > 0) {
        cartes.push({
            icone: "trending-up",
            variant: "emerald",
            titre: "Plus gros gain",
            texte:
                `<strong>${echapperHtmlInvest(meilleur.ticker)}</strong> (${echapperHtmlInvest(meilleur.compte)}) est votre meilleure performance : ` +
                `+${Math.round(meilleur.gainEur).toLocaleString("fr-FR")} € depuis l'achat.`,
        });
    }

    if (pire && pire.gainEur < 0 && pire !== meilleur) {
        cartes.push({
            icone: "coin",
            variant: "negative",
            titre: "Plus grosse perte",
            texte:
                `<strong>${echapperHtmlInvest(pire.ticker)}</strong> (${echapperHtmlInvest(pire.compte)}) affiche la perte la plus importante : ` +
                `${Math.round(pire.gainEur).toLocaleString("fr-FR")} € depuis l'achat.`,
        });
    }

    const totalValeur = positions.reduce((s, p) => s + p.valeurEur, 0);
    if (totalValeur > 0) {
        const plusGrosse = positions.slice().sort((a, b) => b.valeurEur - a.valeurEur)[0];
        const part = (plusGrosse.valeurEur / totalValeur) * 100;
        // Seuil de 25% : au-dela, une seule ligne pese plus que le quart
        // du portefeuille - assez pour qu'une baisse sur ce titre seul
        // affecte nettement l'ensemble.
        if (part >= 25) {
            cartes.push({
                icone: "scale",
                variant: "",
                titre: "Risque de concentration",
                texte:
                    `<strong>${echapperHtmlInvest(plusGrosse.ticker)}</strong> représente ${part.toFixed(0)}% de la valeur totale de vos investissements - ` +
                    `une baisse sur ce titre pèserait fortement sur l'ensemble du portefeuille.`,
            });
        }
    }

    return cartes;
}

function afficherInvestissementInsights() {
    try {
        const section = document.getElementById("navInvestissementInsights");
        const container = document.getElementById("investissementInsightsContainer");
        if (!container) return;
        if (!historiqueComptesGroupes || !Object.keys(historiqueComptesGroupes).length) return;

        const positions = construirePositionsAvecValeurEur();
        const cartes = construireCartesInvestissement(positions);
        if (!cartes.length) return;

        container.innerHTML = cartes
            .map(
                (carte) => `
            <div class="insight-card">
                <span class="icon-badge ${carte.variant}"><svg class="icon" width="16" height="16"><use href="#icon-${carte.icone}"></use></svg></span>
                <div class="insight-body">
                    <div class="insight-title">${echapperHtmlInvest(carte.titre)}</div>
                    <div class="insight-text">${carte.texte}</div>
                </div>
            </div>`
            )
            .join("");

        if (section) section.style.display = "";
    } catch (e) {
        console.warn("Insights investissement non disponibles:", e);
    }
}

window.afficherInvestissementInsights = afficherInvestissementInsights;
