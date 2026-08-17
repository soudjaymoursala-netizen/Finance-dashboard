/* ==================================================
   MES INVESTISSEMENTS — vue unifiee PEA + CTO
   Filtrable (compte, gagnants/perdants), triable et
   cherchable par ticker/societe. Reutilise les positions
   deja calculees par historiqueAchats.js
   (historiqueComptesGroupes) : aucun nouvel appel reseau,
   juste une autre facon de les regarder toutes ensemble.
   ================================================== */

let investFiltres = { compte: "TOUS", statut: "TOUS", recherche: "", tri: "perf_desc" };
let investExpandedPositions = new Set();
let investExpandedGroups = new Set(); // "PEA" / "CTO" - vide = tout replie par defaut

const COMPTE_LABELS = { PEA: "PEA — Trade Republic", CTO: "CTO — YUH" };

function construirePositionsUnifiees() {
    const positions = [];
    Object.values(historiqueComptesGroupes || {}).forEach((compteData) => {
        Object.values(compteData.positions).forEach((pos) => {
            const perf = pos.totalInvesti > 0 ? pos.totalGain / pos.totalInvesti : 0;
            positions.push(Object.assign({}, pos, { perf: perf }));
        });
    });
    return positions;
}

function filtrerEtTrierPositions(positions) {
    const q = investFiltres.recherche.trim().toLowerCase();
    let res = positions.filter((p) => {
        if (investFiltres.compte !== "TOUS" && p.compte !== investFiltres.compte) return false;
        if (investFiltres.statut === "GAGNANT" && p.totalGain < 0) return false;
        if (investFiltres.statut === "PERDANT" && p.totalGain >= 0) return false;
        if (q && !((p.ticker + " " + p.societe).toLowerCase().includes(q))) return false;
        return true;
    });

    const tris = {
        perf_desc: (a, b) => b.perf - a.perf,
        perf_asc: (a, b) => a.perf - b.perf,
        gain_desc: (a, b) => b.totalGain - a.totalGain,
        valeur_desc: (a, b) => b.totalValeur - a.totalValeur,
        nom_asc: (a, b) => a.ticker.localeCompare(b.ticker),
    };
    res.sort(tris[investFiltres.tri] || tris.perf_desc);
    return res;
}

function formatMontantDevise(valeur, devise) {
    return Math.round(valeur).toLocaleString("fr-FR") + " " + devise;
}

function rendreResumeInvestissements(positions) {
    const el = document.getElementById("investissementsSummary");
    if (!el) return;

    if (!positions.length) {
        el.innerHTML = '<div class="invest-summary-empty">Aucune position ne correspond aux filtres.</div>';
        return;
    }

    // Conversion CHF -> EUR pour un total combine indicatif (chaque ligne
    // individuelle garde elle sa devise native, comme dans le detail CTO).
    const taux = (typeof DATA !== "undefined" && DATA.tauxChange) || 1;
    let investiEUR = 0, valeurEUR = 0, gainEUR = 0;
    positions.forEach((p) => {
        const diviseur = p.devise === "CHF" ? taux : 1;
        investiEUR += p.totalInvesti / diviseur;
        valeurEUR += p.totalValeur / diviseur;
        gainEUR += p.totalGain / diviseur;
    });
    const gagnants = positions.filter((p) => p.totalGain >= 0).length;
    const cls = gainEUR >= 0 ? "historique-positif" : "historique-negatif";

    el.innerHTML =
        '<div class="invest-summary-stat"><span class="invest-summary-label">Positions</span><span class="invest-summary-value">' + positions.length + '</span></div>' +
        '<div class="invest-summary-stat"><span class="invest-summary-label">Investi ≈</span><span class="invest-summary-value">' + formatMontantDevise(investiEUR, "€") + '</span></div>' +
        '<div class="invest-summary-stat"><span class="invest-summary-label">Valeur ≈</span><span class="invest-summary-value">' + formatMontantDevise(valeurEUR, "€") + '</span></div>' +
        '<div class="invest-summary-stat"><span class="invest-summary-label">Gain ≈</span><span class="invest-summary-value ' + cls + '">' + (gainEUR >= 0 ? "+" : "") + formatMontantDevise(gainEUR, "€") + '</span></div>' +
        '<div class="invest-summary-stat"><span class="invest-summary-label">Gagnantes</span><span class="invest-summary-value">' + gagnants + '/' + positions.length + '</span></div>';
}

function rendreLignePositionUnifiee(pos) {
    const positionId = pos.compte + "|" + pos.ticker;
    const isExpanded = investExpandedPositions.has(positionId);
    const cls = classeGainPerte(pos.totalGain);
    const badgeClasse = pos.compte === "PEA" ? "emerald" : "gold";

    let html = `
        <div class="historique-position-row ${cls}" data-position="${positionId}">
            <div class="historique-position-header" role="button" tabindex="0" aria-expanded="${isExpanded}">
                <div class="historique-position-toggle">
                    <span class="historique-chevron ${isExpanded ? 'open' : ''}">▼</span>
                </div>
                <div class="historique-position-ticker">
                    <span class="historique-badge ${badgeClasse}">${pos.compte}</span>
                    <strong>${pos.ticker}</strong>
                </div>
                <div class="historique-position-societe">${pos.societe}</div>
                <div class="historique-position-stats">
                    <div class="historique-stat">
                        <span class="historique-stat-label">Investi</span>
                        <span class="historique-stat-value">${formatMontantDevise(pos.totalInvesti, pos.devise)}</span>
                    </div>
                    <div class="historique-stat">
                        <span class="historique-stat-label">Valeur</span>
                        <span class="historique-stat-value">${formatMontantDevise(pos.totalValeur, pos.devise)}</span>
                    </div>
                    <div class="historique-stat">
                        <span class="historique-stat-label ${cls}">Gain</span>
                        <span class="historique-stat-value ${cls}">${pos.totalGain >= 0 ? "+" : ""}${formatMontantDevise(pos.totalGain, pos.devise)}</span>
                    </div>
                    <div class="historique-stat">
                        <span class="historique-stat-label ${cls}">Perf</span>
                        <span class="historique-stat-value ${cls}">${pos.perf >= 0 ? "+" : ""}${(pos.perf * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
    `;

    if (isExpanded) {
        html += `
            <div class="historique-transactions">
                <div class="historique-transaction-header">
                    <div>Date</div>
                    <div>Quantité</div>
                    <div>Prix achat</div>
                    <div>Investi</div>
                    <div>Valeur actuelle</div>
                    <div>Gain/Perte</div>
                    <div>Perf %</div>
                </div>
        `;
        pos.transactions.forEach((tx) => { html += rendreLigneTransaction(tx); });
        html += '</div>';
    }

    html += '</div>';
    return html;
}

/* Niveau 2 (groupe par compte) : n'a de sens que quand le filtre compte
   est sur "Tous" - sinon un seul compte est deja affiche, un groupe
   serait redondant avec le filtre lui-meme. Replie par defaut, comme
   la section elle-meme et chaque position - rien ne s'affiche "tout
   d'un coup" - SAUF pendant une recherche texte active : la ou les
   groupes contenant un resultat s'ouvrent automatiquement, pour ne pas
   forcer un clic supplementaire sur un resultat qu'on vient de taper.
   Cet auto-ouverture ne modifie pas investExpandedGroups : effacer la
   recherche revient exactement a l'etat de pliage precedent. */
function rendreGroupeCompte(compte, positions) {
    const rechercheActive = !!investFiltres.recherche.trim();
    const isOpen = investExpandedGroups.has(compte) || rechercheActive;
    const badgeClasse = compte === "PEA" ? "emerald" : "gold";
    const gainTotal = positions.reduce((s, p) => s + p.totalGain, 0);
    const cls = classeGainPerte(gainTotal);
    const devise = positions[0].devise;

    let html = `
        <div class="invest-group" data-group="${compte}">
            <div class="invest-group-header ${cls}" role="button" tabindex="0" aria-expanded="${isOpen}">
                <span class="historique-badge ${badgeClasse}">${compte}</span>
                <span class="invest-group-name">${COMPTE_LABELS[compte] || compte}</span>
                <span class="historique-inline-count">${positions.length} position${positions.length > 1 ? 's' : ''}</span>
                <span class="invest-group-gain ${cls}">${gainTotal >= 0 ? "+" : ""}${formatMontantDevise(gainTotal, devise)}</span>
                <span class="historique-chevron ${isOpen ? 'open' : ''}">▼</span>
            </div>
    `;

    if (isOpen) {
        html += '<div class="historique-positions invest-group-positions">';
        positions.forEach((p) => { html += rendreLignePositionUnifiee(p); });
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function rendreInvestissements() {
    const section = document.getElementById("navInvestissements");
    const container = document.getElementById("investissementsContainer");
    if (!container || !section) return;

    const toutes = construirePositionsUnifiees();
    if (!toutes.length) {
        section.style.display = "none";
        return;
    }
    section.style.display = "";

    const positions = filtrerEtTrierPositions(toutes);
    rendreResumeInvestissements(positions);

    if (!positions.length) {
        container.innerHTML = '<div class="invest-summary-empty">Aucune position ne correspond aux filtres.</div>';
    } else if (investFiltres.compte === "TOUS") {
        // Groupe par compte (PEA/CTO), chacun repliable independamment
        const parCompte = {};
        positions.forEach((p) => { (parCompte[p.compte] = parCompte[p.compte] || []).push(p); });
        container.innerHTML = ["PEA", "CTO"]
            .filter((compte) => parCompte[compte] && parCompte[compte].length)
            .map((compte) => rendreGroupeCompte(compte, parCompte[compte]))
            .join("");
    } else {
        // Un seul compte deja selectionne via le filtre : pas de niveau
        // groupe redondant, juste la liste des positions de ce compte.
        container.innerHTML = positions.map(rendreLignePositionUnifiee).join("");
    }

    container.querySelectorAll(".invest-group-header").forEach((header) => {
        const activer = () => {
            const compte = header.closest(".invest-group").getAttribute("data-group");
            if (investExpandedGroups.has(compte)) {
                investExpandedGroups.delete(compte);
            } else {
                investExpandedGroups.add(compte);
            }
            rendreInvestissements();
        };
        header.addEventListener("click", activer);
        header.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activer(); }
        });
    });

    container.querySelectorAll(".historique-position-header").forEach((header) => {
        const activer = (e) => {
            const row = header.closest(".historique-position-row");
            const positionId = row.getAttribute("data-position");
            if (investExpandedPositions.has(positionId)) {
                investExpandedPositions.delete(positionId);
            } else {
                investExpandedPositions.add(positionId);
            }
            rendreInvestissements();
        };
        header.addEventListener("click", activer);
        header.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activer(e); }
        });
    });
}

/* Barre de filtres : recherche (debounce), chips compte/statut, tri */
document.addEventListener("DOMContentLoaded", function () {
    const barre = document.getElementById("investFiltersBar");
    if (!barre) return;

    const recherche = document.getElementById("investSearch");
    if (recherche) {
        let debounceId = null;
        recherche.addEventListener("input", () => {
            clearTimeout(debounceId);
            debounceId = setTimeout(() => {
                investFiltres.recherche = recherche.value;
                rendreInvestissements();
            }, 150);
        });
    }

    barre.querySelectorAll(".invest-chip[data-filter]").forEach((chip) => {
        chip.addEventListener("click", () => {
            const filtre = chip.getAttribute("data-filter");
            const valeur = chip.getAttribute("data-value");
            investFiltres[filtre] = valeur;
            barre.querySelectorAll('.invest-chip[data-filter="' + filtre + '"]').forEach((c) => {
                const actif = c === chip;
                c.classList.toggle("active", actif);
                c.setAttribute("aria-pressed", actif ? "true" : "false");
            });
            rendreInvestissements();
        });
    });

    const tri = document.getElementById("investSort");
    if (tri) {
        tri.addEventListener("change", () => {
            investFiltres.tri = tri.value;
            rendreInvestissements();
        });
    }
});
