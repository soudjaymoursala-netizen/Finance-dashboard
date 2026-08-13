/* ================================================== */
/* PERFORMANCE PAR ACHAT (CTO + PEA)                  */
/* Optionnel : n'affiche la section que si les onglets */
/* API_CTO_Historique / API_PEA_Historique existent et */
/* sont branches cote Worker Cloudflare (SHEET_CTO_    */
/* HISTORIQUE / SHEET_PEA_HISTORIQUE). Reste masque    */
/* silencieusement sinon, comme le Suivi mensuel.      */
/*                                                      */
/* Affichage : une carte depliable par actif (regroupe  */
/* tous les achats du meme ticker), plutot qu'une liste  */
/* plate d'achats individuels - plus lisible des qu'un   */
/* titre a ete achete plusieurs fois. Le detail de chaque */
/* achat (date, prix, quantite, perf individuelle) reste  */
/* accessible en depliant la carte.                       */
/* ================================================== */

let historiqueLignesActuelles = [];
let historiquePositions = {};
let historiqueExpandedPositions = new Set();

async function fetchHistoriqueCsv(url, compte, devise) {
    try {
        const r = await fetch(url);
        if (!r.ok) return [];
        const txt = await r.text();
        if (!txt || !txt.trim()) return [];
        const sep = detectSeparator(txt);
        const lines = txt.replace(/\r/g, "").trim().split("\n");
        const lignes = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue;
            const cols = splitCsvLine(lines[i], sep);
            if (cols.length < 10) continue;
            const ticker = (cols[0] || "").trim();
            if (!ticker || ticker === "—" || ticker === "#N/A") continue;
            lignes.push({
                compte: compte,
                devise: devise,
                ticker: ticker,
                societe: (cols[1] || "").trim(),
                date: (cols[2] || "").trim(),
                prix_achat: nettoyerNombre(cols[3]),
                quantite: nettoyerNombre(cols[4]),
                investi: nettoyerNombre(cols[5]),
                valeurActuelle: nettoyerNombre(cols[7]),
                gain: nettoyerNombre(cols[8]),
                perf: nettoyerNombre(cols[9]),
            });
        }
        return lignes;
    } catch (e) {
        console.warn(`Historique ${compte} non disponible:`, e);
        return [];
    }
}

async function chargerHistoriqueAchats() {
    try {
        const section = document.getElementById("historiqueAchatsSection");
        const container = document.getElementById("historiqueAchatsContainer");
        if (!container) return;
        if (!window.CONFIG.URL_CTO_HISTORIQUE && !window.CONFIG.URL_PEA_HISTORIQUE) return;

        const [ctoLignes, peaLignes] = await Promise.all([
            window.CONFIG.URL_CTO_HISTORIQUE
                ? fetchHistoriqueCsv(window.CONFIG.URL_CTO_HISTORIQUE, "CTO", "CHF")
                : Promise.resolve([]),
            window.CONFIG.URL_PEA_HISTORIQUE
                ? fetchHistoriqueCsv(window.CONFIG.URL_PEA_HISTORIQUE, "PEA", "€")
                : Promise.resolve([]),
        ]);

        historiqueLignesActuelles = ctoLignes.concat(peaLignes);
        if (!historiqueLignesActuelles.length) return;

        // Agréger par ticker pour afficher une ligne par actif
        historiquePositions = {};
        historiqueLignesActuelles.forEach((ligne) => {
            const key = `${ligne.ticker}|${ligne.compte}`;
            if (!historiquePositions[key]) {
                historiquePositions[key] = {
                    ticker: ligne.ticker,
                    societe: ligne.societe,
                    compte: ligne.compte,
                    devise: ligne.devise,
                    transactions: [],
                    totalInvesti: 0,
                    totalValeur: 0,
                    totalGain: 0,
                };
            }
            historiquePositions[key].transactions.push(ligne);
            historiquePositions[key].totalInvesti += ligne.investi;
            historiquePositions[key].totalValeur += ligne.valeurActuelle;
            historiquePositions[key].totalGain += ligne.gain;
        });

        rendreHistoriqueAchats();
        if (section) section.style.display = "";
    } catch (e) {
        console.warn("Performance par achat non disponible:", e);
    }
}

function rendreHistoriqueAchats() {
    const container = document.getElementById("historiqueAchatsContainer");
    if (!container) return;

    const positions = Object.values(historiquePositions).sort((a, b) => {
        return b.totalGain - a.totalGain; // Tri par gain (décroissant)
    });

    let html = '<div class="historique-positions">';

    positions.forEach((pos, idx) => {
        const positionId = `${pos.ticker}|${pos.compte}`;
        const isExpanded = historiqueExpandedPositions.has(positionId);
        const perf = pos.totalInvesti > 0 ? (pos.totalGain / pos.totalInvesti) : 0;
        const gainClass = pos.totalGain >= 0 ? "historique-positif" : "historique-negatif";
        const badgeClass = pos.compte === "CTO" ? "gold" : "blue";

        html += `
            <div class="historique-position-row" data-position="${positionId}">
                <div class="historique-position-header" role="button" tabindex="0" aria-expanded="${isExpanded}">
                    <div class="historique-position-toggle">
                        <span class="historique-chevron ${isExpanded ? 'open' : ''}">▼</span>
                    </div>
                    <div class="historique-position-ticker">
                        <span class="historique-badge ${badgeClass}">${pos.compte}</span>
                        <strong>${pos.ticker}</strong>
                    </div>
                    <div class="historique-position-societe">${pos.societe}</div>
                    <div class="historique-position-stats">
                        <div class="historique-stat">
                            <span class="historique-stat-label">Investi</span>
                            <span class="historique-stat-value">${Math.round(pos.totalInvesti).toLocaleString("fr-FR")} ${pos.devise}</span>
                        </div>
                        <div class="historique-stat">
                            <span class="historique-stat-label">Valeur</span>
                            <span class="historique-stat-value">${Math.round(pos.totalValeur).toLocaleString("fr-FR")} ${pos.devise}</span>
                        </div>
                        <div class="historique-stat">
                            <span class="historique-stat-label ${gainClass}">Gain</span>
                            <span class="historique-stat-value ${gainClass}">${pos.totalGain >= 0 ? "+" : ""}${Math.round(pos.totalGain).toLocaleString("fr-FR")} ${pos.devise}</span>
                        </div>
                        <div class="historique-stat">
                            <span class="historique-stat-label ${gainClass}">Perf</span>
                            <span class="historique-stat-value ${gainClass}">${perf >= 0 ? "+" : ""}${(perf * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
        `;

        if (isExpanded) {
            html += '<div class="historique-transactions">';
            pos.transactions.forEach((tx) => {
                const txGainClass = tx.gain >= 0 ? "historique-positif" : "historique-negatif";
                html += `
                    <div class="historique-transaction-row">
                        <div class="historique-tx-date">${tx.date}</div>
                        <div class="historique-tx-qty">${tx.quantite.toFixed(3)} u.</div>
                        <div class="historique-tx-prix">${Math.round(tx.prix_achat).toLocaleString("fr-FR")} ${tx.devise}</div>
                        <div class="historique-tx-investi">${Math.round(tx.investi).toLocaleString("fr-FR")} ${tx.devise}</div>
                        <div class="historique-tx-valeur">${Math.round(tx.valeurActuelle).toLocaleString("fr-FR")} ${tx.devise}</div>
                        <div class="historique-tx-gain ${txGainClass}">${tx.gain >= 0 ? "+" : ""}${Math.round(tx.gain).toLocaleString("fr-FR")} ${tx.devise}</div>
                        <div class="historique-tx-perf ${txGainClass}">${tx.perf >= 0 ? "+" : ""}${(tx.perf * 100).toFixed(1)}%</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;

    // Ajouter les listeners
    container.querySelectorAll(".historique-position-header").forEach((header) => {
        const activer = () => {
            const row = header.closest(".historique-position-row");
            const positionId = row.getAttribute("data-position");
            if (historiqueExpandedPositions.has(positionId)) {
                historiqueExpandedPositions.delete(positionId);
            } else {
                historiqueExpandedPositions.add(positionId);
            }
            rendreHistoriqueAchats();
        };
        header.addEventListener("click", activer);
        header.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activer(); }
        });
    });
}
