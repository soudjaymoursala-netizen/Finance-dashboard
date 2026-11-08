/* ==================================================
   MES INVESTISSEMENTS — vue unifiee PEA + CTO
   Filtrable (compte, gagnants/perdants), triable et
   cherchable par ticker/societe. Reutilise les positions
   deja calculees par historiqueAchats.js
   (historiqueComptesGroupes) : aucun nouvel appel reseau,
   juste une autre facon de les regarder toutes ensemble.
   ================================================== */

let investFiltres = { compte: "TOUS", statut: "TOUS", recherche: "", tri: "perf_desc", periode: "ACHAT" };
try {
    const periodeMemo = localStorage.getItem("financeDashboard_investPeriode");
    if (periodeMemo === "JOUR" || periodeMemo === "MOIS" || periodeMemo === "ACHAT") investFiltres.periode = periodeMemo;
} catch (e) { /* stockage indisponible */ }
let investExpandedPositions = new Set();
let investExpandedGroups = new Set(); // "PEA" / "CTO" - vide = tout replie par defaut

const COMPTE_LABELS = { PEA: "PEA — Trade Republic", CTO: "CTO — YUH" };

function construirePositionsUnifiees() {
    const positions = [];
    Object.values(historiqueComptesGroupes || {}).forEach((compteData) => {
        Object.values(compteData.positions).forEach((pos) => {
            const g = gainPosition(pos, investFiltres.periode);
            // gainP / perfP : gain et performance sur la PERIODE choisie
            // (achat / jour / 30 jours) ; dispoP faux si la reference manque.
            positions.push(Object.assign({}, pos, {
                perf: g.perf, gainP: g.gain, perfP: g.perf, dispoP: g.dispo,
            }));
        });
    });

    // Poids = part de la valeur de la position dans la valeur TOTALE des
    // placements (PEA + CTO, CHF converti en EUR), calcule sur toutes les
    // positions - pas seulement celles qui passent les filtres - pour que
    // le pourcentage d'une ligne ne change pas quand on filtre/cherche.
    const taux = (typeof DATA !== "undefined" && DATA.tauxChange) || 1;
    const enEUR = (p) => (p.devise === "CHF" ? p.totalValeur / taux : p.totalValeur);
    const totalEUR = positions.reduce((somme, p) => somme + Math.max(0, enEUR(p)), 0);
    positions.forEach((p) => {
        p.valeurEUR = enEUR(p);
        p.poids = totalEUR > 0 ? (Math.max(0, p.valeurEUR) / totalEUR) * 100 : 0;
    });
    return positions;
}

function formatPoids(poids) {
    return poids.toFixed(1).replace(".", ",") + " %";
}

function filtrerEtTrierPositions(positions) {
    const q = investFiltres.recherche.trim().toLowerCase();
    let res = positions.filter((p) => {
        if (investFiltres.compte !== "TOUS" && p.compte !== investFiltres.compte) return false;
        if (investFiltres.statut === "GAGNANT" && (!p.dispoP || p.gainP < 0)) return false;
        if (investFiltres.statut === "PERDANT" && (!p.dispoP || p.gainP >= 0)) return false;
        if (q && !((p.ticker + " " + p.societe).toLowerCase().includes(q))) return false;
        return true;
    });

    // Une position sans reference pour la periode (dispoP faux) passe
    // toujours en dernier, quel que soit le sens du tri.
    const avecDispo = (cmp) => (a, b) => (a.dispoP === b.dispoP ? cmp(a, b) : (a.dispoP ? -1 : 1));
    const tris = {
        perf_desc: avecDispo((a, b) => b.perfP - a.perfP),
        perf_asc: avecDispo((a, b) => a.perfP - b.perfP),
        gain_desc: avecDispo((a, b) => b.gainP - a.gainP),
        valeur_desc: (a, b) => b.valeurEUR - a.valeurEUR, // en EUR : compare PEA (EUR) et CTO (CHF) sur la meme base
        poids_desc: (a, b) => b.poids - a.poids,
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
    let investiEUR = 0, valeurEUR = 0, gainEUR = 0, sansReference = 0;
    positions.forEach((p) => {
        const diviseur = p.devise === "CHF" ? taux : 1;
        investiEUR += p.totalInvesti / diviseur;
        valeurEUR += p.totalValeur / diviseur;
        if (p.dispoP) gainEUR += p.gainP / diviseur; else sansReference++;
    });
    const avecReference = positions.length - sansReference;
    const gagnants = positions.filter((p) => p.dispoP && p.gainP >= 0).length;
    const infoPeriode = PERIODES_GAIN[investFiltres.periode] || PERIODES_GAIN.ACHAT;
    const cls = gainEUR >= 0 ? "historique-positif" : "historique-negatif";

    el.innerHTML =
        '<div class="invest-summary-stat"><span class="invest-summary-label">Positions</span><span class="invest-summary-value">' + positions.length + '</span></div>' +
        '<div class="invest-summary-stat"><span class="invest-summary-label">Investi ≈</span><span class="invest-summary-value">' + formatMontantDevise(investiEUR, "€") + '</span></div>' +
        '<div class="invest-summary-stat"><span class="invest-summary-label">Valeur ≈</span><span class="invest-summary-value">' + formatMontantDevise(valeurEUR, "€") + '</span></div>' +
        '<div class="invest-summary-stat"><span class="invest-summary-label">' + infoPeriode.libelleSomme + '</span><span class="invest-summary-value ' + cls + '">' + (gainEUR >= 0 ? "+" : "") + formatMontantDevise(gainEUR, "€") + '</span></div>' +
        '<div class="invest-summary-stat"><span class="invest-summary-label">Gagnantes</span><span class="invest-summary-value">' + gagnants + '/' + avecReference + '</span></div>' +
        (sansReference ? '<div class="invest-summary-note">' + sansReference + ' position' + (sansReference > 1 ? 's' : '') + ' sans cours de référence pour cette période (non comptée' + (sansReference > 1 ? 's' : '') + ').</div>' : '');
}

function rendreLignePositionUnifiee(pos) {
    const positionId = pos.compte + "|" + pos.ticker;
    const isExpanded = investExpandedPositions.has(positionId);
    const infoPeriode = PERIODES_GAIN[investFiltres.periode] || PERIODES_GAIN.ACHAT;
    // Sans reference pour la periode : on affiche "—" (neutre), pas 0.
    const cls = pos.dispoP ? classeGainPerte(pos.gainP) : "";
    const gainTxt = pos.dispoP ? (pos.gainP >= 0 ? "+" : "") + formatMontantDevise(pos.gainP, pos.devise) : "—";
    const perfTxt = pos.dispoP ? (pos.perfP >= 0 ? "+" : "") + (pos.perfP * 100).toFixed(1) + "%" : "—";
    const badgeClasse = pos.compte === "PEA" ? "emerald" : "gold";

    let html = `
        <div class="historique-position-row ${cls || "historique-neutre"}" data-position="${positionId}">
            <div class="historique-position-header invest-header" role="button" tabindex="0" aria-expanded="${isExpanded}">
                <div class="historique-position-toggle">
                    <span class="historique-chevron ${isExpanded ? 'open' : ''}">▼</span>
                </div>
                <div class="historique-position-ticker">
                    <span class="historique-badge ${badgeClasse}">${pos.compte}</span>
                    <strong>${pos.ticker}</strong>
                </div>
                <div class="historique-position-societe">${pos.societe}</div>
                <div class="historique-position-stats avec-poids">
                    <div class="historique-stat">
                        <span class="historique-stat-label">Investi</span>
                        <span class="historique-stat-value">${formatMontantDevise(pos.totalInvesti, pos.devise)}</span>
                    </div>
                    <div class="historique-stat">
                        <span class="historique-stat-label">Valeur</span>
                        <span class="historique-stat-value">${formatMontantDevise(pos.totalValeur, pos.devise)}</span>
                    </div>
                    <div class="historique-stat" title="Part de la valeur de tes placements (PEA + CTO)" aria-label="Poids dans les placements : ${formatPoids(pos.poids)}">
                        <span class="historique-stat-label">Poids</span>
                        <span class="invest-weight-value">${formatPoids(pos.poids)}</span>
                        <span class="invest-weight-bar" aria-hidden="true"><span style="width:${Math.min(100, pos.poids).toFixed(1)}%"></span></span>
                    </div>
                    <div class="historique-stat">
                        <span class="historique-stat-label ${cls}">${infoPeriode.libelleGain}</span>
                        <span class="historique-stat-value ${cls}">${gainTxt}</span>
                    </div>
                    <div class="historique-stat">
                        <span class="historique-stat-label ${cls}">Perf</span>
                        <span class="historique-stat-value ${cls}">${perfTxt}</span>
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
    const gainTotal = positions.reduce((s, p) => s + (p.dispoP ? p.gainP : 0), 0);
    const cls = classeGainPerte(gainTotal);
    const devise = positions[0].devise;
    // Poids du compte dans les placements : somme des poids de ses lignes
    // (poids deja calcule sur l'ensemble PEA + CTO, donc stable sous filtre).
    const poidsGroupe = positions.reduce((somme, p) => somme + p.poids, 0);

    let html = `
        <div class="invest-group" data-group="${compte}">
            <div class="invest-group-header ${cls}" role="button" tabindex="0" aria-expanded="${isOpen}">
                <span class="historique-badge ${badgeClasse}">${compte}</span>
                <span class="invest-group-name">${COMPTE_LABELS[compte] || compte}</span>
                <span class="historique-inline-count">${positions.length} position${positions.length > 1 ? 's' : ''} · ${formatPoids(poidsGroupe)} des placements</span>
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
            if (filtre === "periode") {
                try { localStorage.setItem("financeDashboard_investPeriode", valeur); } catch (e) { /* stockage indisponible */ }
                if (typeof afficherInvestissementInsights === "function") afficherInvestissementInsights();
            }
            barre.querySelectorAll('.invest-chip[data-filter="' + filtre + '"]').forEach((c) => {
                const actif = c === chip;
                c.classList.toggle("active", actif);
                c.setAttribute("aria-pressed", actif ? "true" : "false");
            });
            rendreInvestissements();
        });
    });

    barre.querySelectorAll('.invest-chip[data-filter="periode"]').forEach((c) => {
        const actif = c.getAttribute("data-value") === investFiltres.periode;
        c.classList.toggle("active", actif);
        c.setAttribute("aria-pressed", actif ? "true" : "false");
    });

    const tri = document.getElementById("investSort");
    if (tri) {
        tri.addEventListener("change", () => {
            investFiltres.tri = tri.value;
            rendreInvestissements();
        });
    }
});
