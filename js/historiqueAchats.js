/* ================================================== */
/* PERFORMANCE PAR ACHAT (CTO + PEA)                  */
/* Optionnel : n'affiche la section que si les onglets */
/* API_CTO_Historique / API_PEA_Historique existent et */
/* sont branches cote Worker Cloudflare (SHEET_CTO_    */
/* HISTORIQUE / SHEET_PEA_HISTORIQUE). Reste masque    */
/* silencieusement sinon, comme le Suivi mensuel.      */
/*                                                      */
/* Chaque ligne = un achat individuel (pas une position */
/* agregee) : ticker, date d'achat, prix d'achat, valeur */
/* actuelle de CE lot precis, gain/perte. Permet de voir */
/* quels achats ont bien/mal performe selon leur date -  */
/* remplace ce que Google Finance ne propose plus.       */
/* ================================================== */

let historiqueLignesActuelles = [];
let historiqueTriColonne = "perf";
let historiqueTriSens = "desc";

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
        if (!historiqueLignesActuelles.length) return; // pas encore configure cote Worker

        rendreHistoriqueAchats();
        if (section) section.style.display = "";
    } catch (e) {
        console.warn("Performance par achat non disponible:", e);
    }
}

function rendreHistoriqueAchats() {
    const container = document.getElementById("historiqueAchatsContainer");
    if (!container) return;

    const lignes = historiqueLignesActuelles.slice().sort((a, b) => {
        let va = a[historiqueTriColonne];
        let vb = b[historiqueTriColonne];
        if (typeof va === "string") { va = va.toLowerCase(); vb = vb.toLowerCase(); }
        if (va < vb) return historiqueTriSens === "asc" ? -1 : 1;
        if (va > vb) return historiqueTriSens === "asc" ? 1 : -1;
        return 0;
    });

    const colonnes = [
        { key: "compte", label: "Compte" },
        { key: "ticker", label: "Ticker" },
        { key: "societe", label: "Société" },
        { key: "date", label: "Date" },
        { key: "investi", label: "Investi" },
        { key: "valeurActuelle", label: "Valeur actuelle" },
        { key: "gain", label: "Gain/Perte" },
        { key: "perf", label: "Perf %" },
    ];

    let html = '<div class="historique-table-wrap"><table class="historique-table"><thead><tr>';
    colonnes.forEach((col) => {
        const actif = col.key === historiqueTriColonne;
        const fleche = actif ? (historiqueTriSens === "asc" ? " ▲" : " ▼") : "";
        html += `<th data-col="${col.key}" class="${actif ? "sorted" : ""}" role="button" tabindex="0">${col.label}${fleche}</th>`;
    });
    html += "</tr></thead><tbody>";

    lignes.forEach((l) => {
        const gainClass = l.gain >= 0 ? "historique-positif" : "historique-negatif";
        const perfTxt = (l.perf * 100).toFixed(1) + " %";
        const badgeClass = l.compte === "CTO" ? "gold" : "blue";
        html += `<tr>
            <td><span class="historique-badge ${badgeClass}">${l.compte}</span></td>
            <td class="historique-ticker">${l.ticker}</td>
            <td class="historique-societe">${l.societe}</td>
            <td>${l.date}</td>
            <td>${Math.round(l.investi).toLocaleString("fr-FR")} ${l.devise}</td>
            <td>${Math.round(l.valeurActuelle).toLocaleString("fr-FR")} ${l.devise}</td>
            <td class="${gainClass}">${l.gain >= 0 ? "+" : ""}${Math.round(l.gain).toLocaleString("fr-FR")} ${l.devise}</td>
            <td class="${gainClass}">${l.perf >= 0 ? "+" : ""}${perfTxt}</td>
        </tr>`;
    });
    html += "</tbody></table></div>";

    container.innerHTML = html;

    container.querySelectorAll("th[data-col]").forEach((th) => {
        const activer = () => {
            const col = th.getAttribute("data-col");
            if (historiqueTriColonne === col) {
                historiqueTriSens = historiqueTriSens === "asc" ? "desc" : "asc";
            } else {
                historiqueTriColonne = col;
                historiqueTriSens = (col === "perf" || col === "gain" || col === "investi" || col === "valeurActuelle") ? "desc" : "asc";
            }
            rendreHistoriqueAchats();
        };
        th.addEventListener("click", activer);
        th.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activer(); }
        });
    });
}
