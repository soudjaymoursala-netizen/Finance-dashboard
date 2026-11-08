/* ================================================== */
/* REPARTITION PAR CLASSE D'ACTIFS (hero)             */
/* Barre segmentee Cash / Actions / ETF / Crypto sous  */
/* le patrimoine total. Purement calcule a partir des  */
/* donnees deja chargees (DATA) : aucun appel reseau,  */
/* aucune colonne Sheet supplementaire.                */
/*                                                      */
/* Informatif uniquement : une proportion n'est pas un  */
/* signal, donc palette monochrome (cf. getMonoPalette) */
/* comme les donuts de repartition.                     */
/* ================================================== */

let derniereRepartitionActifs = null;

/* Calcule la ventilation en EUR. Les montants CTO sont en CHF et sont
   convertis en divisant par le taux EUR/CHF (meme convention que
   googleSheets.js). Ce qui n'est ni Cash, ni Actions, ni ETF, ni Crypto
   (ex: liquidites a l'interieur d'un compte titres) est regroupe dans
   "Autres" plutot que d'etre ignore, pour que le total reste coherent. */
function calculerRepartitionActifs(d) {
    const taux = d.tauxChange || 1;
    const total = d.patrimoine || 0;
    if (total <= 0) return [];

    const cash = d.budget.cash_dispo_total || 0;
    const actions = (d.pea.pea_action || 0) + (d.cto.cto_action || 0) / taux;
    const etf = (d.pea.pea_etf || 0) + (d.cto.cto_etf || 0) / taux;
    const crypto = (d.cto.cto_crypto || 0) / taux;
    const autres = total - (cash + actions + etf + crypto);

    const lignes = [
        { cle: "cash", label: "Cash", montant: cash },
        { cle: "actions", label: "Actions", montant: actions },
        { cle: "etf", label: "ETF", montant: etf },
        { cle: "crypto", label: "Crypto", montant: crypto },
    ];
    // "Autres" n'apparait que s'il pese plus de 0,5 % (arrondis/liquidites
    // de compte) ; un ecart negatif (donnees incoherentes) est ignore.
    if (autres / total > 0.005) {
        lignes.push({ cle: "autres", label: "Autres", montant: autres,
            aide: "Liquidités de compte titres et écarts d'arrondi" });
    }

    return lignes
        .filter((l) => l.montant > 0)
        .map((l) => Object.assign(l, { pct: (l.montant / total) * 100 }))
        .sort((a, b) => b.montant - a.montant);
}

function afficherRepartitionActifs(d) {
    const bloc = document.getElementById("assetMix");
    const barre = document.getElementById("assetMixBar");
    const legende = document.getElementById("assetMixLegend");
    if (!bloc || !barre || !legende) return;

    const lignes = calculerRepartitionActifs(d || (typeof DATA !== "undefined" ? DATA : null) || {});
    derniereRepartitionActifs = lignes;
    if (!lignes.length) {
        bloc.style.display = "none";
        return;
    }
    bloc.style.display = "";

    // Palette : de la plus foncee (plus gros poste) a la plus claire.
    // Au-dela de 5 teintes on boucle (4 postes + "Autres" au maximum).
    const couleurs = typeof getMonoPalette === "function" ? getMonoPalette(5) : [];
    const fmt = (v) => Math.round(v).toLocaleString("fr-FR") + " €";

    barre.innerHTML = "";
    legende.innerHTML = "";
    const resume = [];
    lignes.forEach((l, i) => {
        const couleur = couleurs[i % (couleurs.length || 1)] || "#34D399";
        const pct = l.pct.toFixed(1).replace(".", ",");
        resume.push(l.label + " " + pct + " %");

        const seg = document.createElement("span");
        seg.className = "asset-mix-seg";
        seg.style.width = l.pct + "%";
        seg.style.background = couleur;
        seg.title = l.label + " : " + fmt(l.montant) + " (" + pct + " %)";
        barre.appendChild(seg);

        const li = document.createElement("li");
        li.className = "asset-mix-item";
        if (l.aide) li.title = l.aide;
        li.innerHTML =
            '<span class="asset-mix-dot" style="background:' + couleur + '"></span>' +
            '<span class="asset-mix-name">' + l.label + '</span>' +
            '<span class="asset-mix-pct">' + pct + ' %</span>' +
            '<span class="asset-mix-amount">' + fmt(l.montant) + '</span>';
        legende.appendChild(li);
    });
    barre.setAttribute("aria-label", "Répartition du patrimoine : " + resume.join(", "));
}

window.afficherRepartitionActifs = afficherRepartitionActifs;

/* Changement de theme : la palette depend du mode clair/sombre. */
window.refreshAssetMix = function () {
    if (derniereRepartitionActifs && typeof DATA !== "undefined") afficherRepartitionActifs(DATA);
};
