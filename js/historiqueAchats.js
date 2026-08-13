/* ================================================== */
/* PERFORMANCE PAR ACHAT (CTO + PEA)                  */
/* Optionnel : n'affiche la section que si les onglets */
/* API_CTO_Historique / API_PEA_Historique existent et */
/* sont branches cote Worker Cloudflare (SHEET_CTO_    */
/* HISTORIQUE / SHEET_PEA_HISTORIQUE). Reste masque    */
/* silencieusement sinon, comme le Suivi mensuel.      */
/*                                                      */
/* Hierarchie a 3 niveaux :                            */
/*   Compte (CTO / PEA)                                */
/*     -> Actif (ticker, ex: NVDA) - agrege tous les    */
/*        achats de ce titre                            */
/*        -> Achat individuel (date, prix, quantite,    */
/*           perf de CE lot precis), tries par date      */
/*           d'achat croissante.                          */
/* Code couleur (vert/rouge) applique a chaque niveau :   */
/* carte compte, ligne actif, et ligne achat - gain ou    */
/* perte visible d'un coup d'oeil sans lire les chiffres. */
/* ================================================== */

let historiqueLignesActuelles = [];
let historiqueComptesGroupes = {};
let historiqueComptesOuverts = new Set();
let historiqueExpandedPositions = new Set();

function parseDateFr(str) {
    const parts = (str || "").split("/");
    if (parts.length !== 3) return 0;
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (!d || !m || !y) return 0;
    return new Date(y, m - 1, d).getTime();
}

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

        historiqueComptesGroupes = {};
        historiqueLignesActuelles.forEach((ligne) => {
            if (!historiqueComptesGroupes[ligne.compte]) {
                historiqueComptesGroupes[ligne.compte] = {
                    compte: ligne.compte,
                    devise: ligne.devise,
                    positions: {},
                    totalInvesti: 0,
                    totalValeur: 0,
                    totalGain: 0,
                };
            }
            const compteData = historiqueComptesGroupes[ligne.compte];

            if (!compteData.positions[ligne.ticker]) {
                compteData.positions[ligne.ticker] = {
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
            const pos = compteData.positions[ligne.ticker];
            pos.transactions.push(ligne);
            pos.totalInvesti += ligne.investi;
            pos.totalValeur += ligne.valeurActuelle;
            pos.totalGain += ligne.gain;

            compteData.totalInvesti += ligne.investi;
            compteData.totalValeur += ligne.valeurActuelle;
            compteData.totalGain += ligne.gain;
        });

        Object.values(historiqueComptesGroupes).forEach((compteData) => {
            Object.values(compteData.positions).forEach((pos) => {
                pos.transactions.sort((a, b) => parseDateFr(a.date) - parseDateFr(b.date));
            });
        });

        rendreHistoriqueAchats();
        if (section) section.style.display = "";
    } catch (e) {
        console.warn("Performance par achat non disponible:", e);
    }
}

function classeGainPerte(valeur) {
    return valeur >= 0 ? "historique-positif" : "historique-negatif";
}

function rendreLigneTransaction(tx) {
    const cls = classeGainPerte(tx.gain);
    return `
        <div class="historique-transaction-row ${cls}">
            <div class="historique-tx-date">${tx.date}</div>
            <div class="historique-tx-qty">${tx.quantite.toFixed(3)} u.</div>
            <div class="historique-tx-prix">${Math.round(tx.prix_achat).toLocaleString("fr-FR")} ${tx.devise}</div>
            <div class="historique-tx-investi">${Math.round(tx.investi).toLocaleString("fr-FR")} ${tx.devise}</div>
            <div class="historique-tx-valeur">${Math.round(tx.valeurActuelle).toLocaleString("fr-FR")} ${tx.devise}</div>
            <div class="historique-tx-gain ${cls}">${tx.gain >= 0 ? "+" : ""}${Math.round(tx.gain).toLocaleString("fr-FR")} ${tx.devise}</div>
            <div class="historique-tx-perf ${cls}">${tx.perf >= 0 ? "+" : ""}${(tx.perf * 100).toFixed(1)}%</div>
        </div>
    `;
}

function rendreLignePosition(pos) {
    const positionId = `${pos.compte}|${pos.ticker}`;
    const isExpanded = historiqueExpandedPositions.has(positionId);
    const perf = pos.totalInvesti > 0 ? (pos.totalGain / pos.totalInvesti) : 0;
    const cls = classeGainPerte(pos.totalGain);

    let html = `
        <div class="historique-position-row ${cls}" data-position="${positionId}">
            <div class="historique-position-header" role="button" tabindex="0" aria-expanded="${isExpanded}">
                <div class="historique-position-toggle">
                    <span class="historique-chevron ${isExpanded ? 'open' : ''}">▼</span>
                </div>
                <div class="historique-position-ticker">
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
                        <span class="historique-stat-label ${cls}">Gain</span>
                        <span class="historique-stat-value ${cls}">${pos.totalGain >= 0 ? "+" : ""}${Math.round(pos.totalGain).toLocaleString("fr-FR")} ${pos.devise}</span>
                    </div>
                    <div class="historique-stat">
                        <span class="historique-stat-label ${cls}">Perf</span>
                        <span class="historique-stat-value ${cls}">${perf >= 0 ? "+" : ""}${(perf * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
    `;

    if (isExpanded) {
        html += '<div class="historique-transactions">';
        pos.transactions.forEach((tx) => { html += rendreLigneTransaction(tx); });
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function rendreCarteCompte(compteData) {
    const isOpen = historiqueComptesOuverts.has(compteData.compte);
    const perf = compteData.totalInvesti > 0 ? (compteData.totalGain / compteData.totalInvesti) : 0;
    const cls = classeGainPerte(compteData.totalGain);
    const badgeClass = compteData.compte === "CTO" ? "gold" : "blue";

    const positions = Object.values(compteData.positions).sort((a, b) => b.totalGain - a.totalGain);

    let html = `
        <div class="historique-compte-card ${cls}" data-compte="${compteData.compte}">
            <div class="historique-compte-header" role="button" tabindex="0" aria-expanded="${isOpen}">
                <span class="icon-badge ${badgeClass}">${compteData.compte === "CTO" ? "🏦" : "📈"}</span>
                <span class="historique-compte-title">${compteData.compte}</span>
                <div class="historique-compte-stats">
                    <div class="historique-stat">
                        <span class="historique-stat-label">Investi</span>
                        <span class="historique-stat-value">${Math.round(compteData.totalInvesti).toLocaleString("fr-FR")} ${compteData.devise}</span>
                    </div>
                    <div class="historique-stat">
                        <span class="historique-stat-label">Valeur</span>
                        <span class="historique-stat-value">${Math.round(compteData.totalValeur).toLocaleString("fr-FR")} ${compteData.devise}</span>
                    </div>
                    <div class="historique-stat">
                        <span class="historique-stat-label ${cls}">Gain</span>
                        <span class="historique-stat-value ${cls}">${compteData.totalGain >= 0 ? "+" : ""}${Math.round(compteData.totalGain).toLocaleString("fr-FR")} ${compteData.devise}</span>
                    </div>
                    <div class="historique-stat">
                        <span class="historique-stat-label ${cls}">Perf</span>
                        <span class="historique-stat-value ${cls}">${perf >= 0 ? "+" : ""}${(perf * 100).toFixed(1)}%</span>
                    </div>
                </div>
                <span class="historique-chevron historique-compte-chevron ${isOpen ? 'open' : ''}">▼</span>
            </div>
    `;

    if (isOpen) {
        html += '<div class="historique-compte-content"><div class="historique-positions">';
        positions.forEach((pos) => { html += rendreLignePosition(pos); });
        html += '</div></div>';
    }

    html += '</div>';
    return html;
}

function rendreHistoriqueAchats() {
    const container = document.getElementById("historiqueAchatsContainer");
    if (!container) return;

    const ordreComptes = ["CTO", "PEA"];
    let html = '<div class="historique-comptes">';
    ordreComptes.forEach((compte) => {
        if (historiqueComptesGroupes[compte]) {
            html += rendreCarteCompte(historiqueComptesGroupes[compte]);
        }
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll(".historique-compte-header").forEach((header) => {
        const activer = () => {
            const carte = header.closest(".historique-compte-card");
            const compte = carte.getAttribute("data-compte");
            if (historiqueComptesOuverts.has(compte)) {
                historiqueComptesOuverts.delete(compte);
            } else {
                historiqueComptesOuverts.add(compte);
            }
            rendreHistoriqueAchats();
        };
        header.addEventListener("click", activer);
        header.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activer(); }
        });
    });

    container.querySelectorAll(".historique-position-header").forEach((header) => {
        const activer = (e) => {
            e.stopPropagation();
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
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activer(e); }
        });
    });
}
