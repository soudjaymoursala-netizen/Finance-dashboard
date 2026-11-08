let patrimoineChart = null;
let allocationChart = null;
let peaCompositionCharts = {}; // { [containerId]: ApexCharts instance } - graphique Graphiques + mini dans la carte compte
let ctoCompositionCharts = {};
let monthlyBudgetCharts = {}; // { [containerId]: ApexCharts instance }
let lastMonthlyBudgetByYear = {}; // { [containerId]: { labels, revenus, depenses } } - pour refreshCharts (changement de theme)

let lastPatrimoine = { labels: [], valeurs: [], objectif: 250000 };
let lastAllocation = { cash: 0, pea: 0, cto: 0 };
let lastPeaComposition = { actions: 0, etf: 0 };
let lastCtoComposition = { actions: 0, etf: 0, crypto: 0 };
let lastPeaSeries = { valeurs: [] };
let lastCtoSeries = { valeurs: [] };

// Historique COMPLET du patrimoine (jamais tronqué), separe de lastPatrimoine
// qui contient lui la tranche actuellement AFFICHEE dans le graphique (selon
// la periode choisie ci-dessous). La sparkline du hero reste toujours basee
// sur l'historique complet, independamment de la periode selectionnee ici.
let patrimoineHistoryFull = { labels: [], valeurs: [], objectif: 250000 };
let currentPatrimoinePeriod = (function () {
    try { return localStorage.getItem("patrimoinePeriod") || "ALL"; } catch (e) { return "ALL"; }
})();

function getThemeMode() {
  return document && document.body && document.body.classList.contains("light") ? "light" : "dark";
}

/* Lit une variable CSS calculee (fallback hex si le DOM n'est pas encore
   pret) - les graphiques ApexCharts ne comprennent pas var(--xxx)
   directement, il faut leur passer un hex resolu, mais on evite de le
   dupliquer en dur pour rester coherent si la palette change. */
function getCssVar(nom, repliDark, repliLight) {
  try {
    const val = getComputedStyle(document.body).getPropertyValue(nom).trim();
    if (val) return val;
  } catch (e) { /* DOM pas pret, on utilise le repli */ }
  return getThemeMode() === "light" ? repliLight : repliDark;
}

/* Couleur de texte pour les légendes/labels ApexCharts, adaptée au thème */
function getChartTextColor() {
  return getCssVar("--text-color", "#F4F6F8", "#12161F");
}

/* Couleur de texte secondaire (axes, labels discrets) */
function getChartMutedColor() {
  return getCssVar("--text-secondary-color", "#8B93A1", "#667085");
}

/* Couleurs de statut (positif/attention/info/negatif) adaptees au theme.
   Les teintes "mode sombre" (vives) tombaient a 1.9-3.3:1 de contraste
   sur fond blanc en mode clair (echec WCAG AA, seuil 4.5:1 pour du
   petit texte) - variantes assombries validees pour le mode clair. */
function getStatusColor(status) {
  const light = getThemeMode() === "light";
  const map = {
    positive: light ? "#059669" : "#34D399",
    warning:  light ? "#9C5F00" : "#FBBF24",
    info:     light ? "#667085" : "#8B93A1",
    negative: light ? "#DC2626" : "#F87171"
  };
  return map[status] || map.info;
}
window.getStatusColor = getStatusColor;

/* Couleur de contour des segments de donut : doit se fondre avec le fond
   de carte pour un rendu plus net (au lieu du blanc par defaut d'ApexCharts) */
function getChartStrokeColor() {
  return getCssVar("--secondary-color", "#12161F", "#FFFFFF");
}

/* Palette pour les donuts de REPARTITION (categorie : Cash/PEA/CTO,
   Actions/ETF/Crypto...) : un seul degrade de l'accent de marque plutot
   que plusieurs teintes non liees entre elles - ce n'est pas un signal
   positif/negatif, juste une proportion, donc pas besoin de plusieurs
   couleurs distinctes qui suggereraient (a tort) plusieurs categories
   de valeur. */
function getMonoPalette(n) {
  const dark = ["#059669", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5"];
  const light = ["#047857", "#059669", "#10B981", "#6EE7B7", "#A7F3D0"];
  const palette = getThemeMode() === "light" ? light : dark;
  return palette.slice(0, n);
}


/* ==================================================
   LIBELLES D'AXE — graphique hero
   Les labels de la Sheet sont bruts ("Jan_25", "Mars 2026"...) :
   affiches tels quels ils se chevauchent. On les normalise en
   "janv. 25" pour l'axe (et "janvier 2025" dans l'infobulle), et on
   n'en montre qu'un sur N selon le nombre de points et la largeur
   d'ecran. Si un label n'est pas reconnu, il est affiche tel quel.
   ================================================== */
const MOIS_ABREGES = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS_INDEX = {
  jan: 0, janv: 0, fev: 1, fevr: 1, mar: 2, mars: 2, avr: 3, mai: 4, juin: 5, juil: 6, aout: 7, aou: 7,
  sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
};

function normaliserLabelMois(label) {
  if (label === null || label === undefined) return null;
  const brut = label.toString().trim();
  // "Jan_25" / "Dec_25" / "Janv-26"
  const m = brut.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/^([a-z]+)[_\-\s.]+(\d{2}|\d{4})$/);
  if (m && MOIS_COURTS_INDEX[m[1]] !== undefined) {
    const annee = m[2].length === 2 ? 2000 + parseInt(m[2], 10) : parseInt(m[2], 10);
    return { mois: MOIS_COURTS_INDEX[m[1]], annee: annee };
  }
  const d = parseLabelDate(brut);
  if (d && !isNaN(d.getTime())) return { mois: d.getMonth(), annee: d.getFullYear() };
  return null;
}

/* Label ambigu ou inconnu (ex: "Jui_26" = juin OU juillet) : on le deduit
   de ses voisins reconnus, puisque la Sheet est une suite mensuelle. */
function normaliserLabelContexte(labels, i) {
  const direct = normaliserLabelMois(labels ? labels[i] : null);
  if (direct || !labels || i < 0) return direct;
  const decaler = (n, k) => {
    const total = n.annee * 12 + n.mois + k;
    return { mois: ((total % 12) + 12) % 12, annee: Math.floor(total / 12) };
  };
  for (let k = 1; k <= 3; k++) {
    const avant = i - k >= 0 ? normaliserLabelMois(labels[i - k]) : null;
    if (avant) return decaler(avant, k);
    const apres = i + k < labels.length ? normaliserLabelMois(labels[i + k]) : null;
    if (apres) return decaler(apres, -k);
  }
  return null;
}

function formaterLabelAxe(label, labels, i) {
  const n = labels ? normaliserLabelContexte(labels, i) : normaliserLabelMois(label);
  return n ? MOIS_ABREGES[n.mois] + " " + String(n.annee).slice(-2) : String(label);
}

function formaterLabelLong(label, labels, i) {
  const n = labels ? normaliserLabelContexte(labels, i) : normaliserLabelMois(label);
  return n ? MOIS_LONGS[n.mois] + " " + n.annee : String(label);
}

/* Nombre maximal de libelles visibles sur l'axe selon la largeur. */
function maxLibellesAxe() {
  const w = window.innerWidth || 1024;
  if (w < 480) return 4;
  if (w < 768) return 6;
  return 8;
}


/* ==================================================
   GAIN DE MARCHE vs APPORTS (chantier 4)
   Optionnel : necessite la colonne 5 "apports cumules" dans
   API_EVOLUTION. Sur la periode affichee :
     gain de marche = variation du patrimoine - variation des apports
   Sans cette colonne (ou sur 1J), la ligne reste masquee.
   ================================================== */
let patrimoineApports = [];

function setPatrimoineApports(apports) {
  patrimoineApports = Array.isArray(apports) ? apports : [];
}
window.setPatrimoineApports = setPatrimoineApports;

function afficherGainMarche(startIndex) {
  const el = document.getElementById("patrimoineMarche");
  if (!el) return;
  const cacher = () => { el.style.display = "none"; el.innerHTML = ""; };

  const { valeurs } = patrimoineHistoryFull;
  if (!valeurs || !valeurs.length || !patrimoineApports.length || typeof startIndex !== "number") return cacher();

  // Premier point de la tranche qui a a la fois un patrimoine et un apport
  let debut = -1;
  for (let i = startIndex; i < valeurs.length; i++) {
    if (valeurs[i] > 0 && typeof patrimoineApports[i] === "number") { debut = i; break; }
  }
  const fin = valeurs.length - 1;
  if (debut < 0 || debut >= fin || typeof patrimoineApports[fin] !== "number") return cacher();

  const deltaPatrimoine = valeurs[fin] - valeurs[debut];
  const deltaApports = patrimoineApports[fin] - patrimoineApports[debut];
  const gainMarche = deltaPatrimoine - deltaApports;
  const fmt = (v) => (v >= 0 ? "+" : "−") + Math.abs(Math.round(v)).toLocaleString("fr-FR") + " €";

  el.style.display = "";
  el.innerHTML =
    '<span class="marche-item ' + (gainMarche >= 0 ? "up" : "down") + '"><span class="marche-label">Gain de marché</span> ' + fmt(gainMarche) + '</span>' +
    '<span class="marche-item"><span class="marche-label">Apports</span> ' + fmt(deltaApports) + '</span>';
}

/* ==================================================
   PROJECTION INFORMATIVE (chantier 5)
   Prolonge la courbe en pointille a partir de TES chiffres : l'epargne
   annuelle de la carte FIRE (DATA.epargneAnnuelle) et un rendement
   annuel hypothetique que tu choisis (0 / 3 / 5 %). Ce n'est ni une
   prevision ni un conseil : un simple "et si". Desactivee par defaut ;
   choix memorise dans ce navigateur uniquement.
   ================================================== */
const PROJECTION_KEY = "financeDashboard_projectionRate";
const MOIS_CODES = ["jan", "fev", "mar", "avr", "mai", "juin", "juil", "aout", "sep", "oct", "nov", "dec"];
let projectionRate = (function () {
  try {
    const v = localStorage.getItem(PROJECTION_KEY);
    return v !== null && v !== "off" && !isNaN(parseFloat(v)) ? parseFloat(v) : null;
  } catch (e) { return null; }
})();

function genererLabelsFuturs(dernierLabel, n, contexte) {
  const base = contexte ? normaliserLabelContexte(contexte, contexte.length - 1) : normaliserLabelMois(dernierLabel);
  if (!base) return null;
  const labels = [];
  let mois = base.mois, annee = base.annee;
  for (let i = 0; i < n; i++) {
    mois++;
    if (mois > 11) { mois = 0; annee++; }
    labels.push(MOIS_CODES[mois] + "_" + String(annee).slice(-2));
  }
  return labels;
}

/* Renvoie {labels, actuel, projection, nbActuel, texte} ou null si la
   projection n'est pas applicable (desactivee, 1J, labels non datables,
   pas d'epargne positive). */
function construireProjection(labels, valeurs, objectif) {
  const note = document.getElementById("projectionNote");
  const ecrire = (txt) => { if (note) { note.textContent = txt; note.style.display = txt ? "" : "none"; } };
  ecrire("");
  if (projectionRate === null || currentPatrimoinePeriod === "1J" || !labels || labels.length < 2) return null;

  const epargneAn = typeof DATA !== "undefined" ? DATA.epargneAnnuelle : 0;
  const dernier = valeurs[valeurs.length - 1];
  if (!(epargneAn > 0) || !(dernier > 0) || !(objectif > 0)) return null;
  if (!normaliserLabelContexte(labels, labels.length - 1)) return null;

  const mensuel = epargneAn / 12;
  const tauxMensuel = Math.pow(1 + projectionRate / 100, 1 / 12) - 1;

  // Mois necessaires pour atteindre l'objectif (plafond 50 ans)
  let v = dernier, moisAtteinte = null;
  const serie = [];
  for (let m = 1; m <= 600; m++) {
    v = v * (1 + tauxMensuel) + mensuel;
    serie.push(v);
    if (moisAtteinte === null && v >= objectif) { moisAtteinte = m; break; }
  }

  // Horizon affiche : assez court pour garder la partie reelle lisible
  const horizon = Math.min(moisAtteinte || 600, Math.max(12, valeurs.length * 2), 180);
  const serieAffichee = serie.slice(0, horizon);
  const futurs = genererLabelsFuturs(labels[labels.length - 1], serieAffichee.length, labels);
  if (!futurs) return null;

  const fmtTaux = projectionRate === 0 ? "0 %" : projectionRate + " %";
  let phrase;
  if (moisAtteinte) {
    const f = genererLabelsFuturs(labels[labels.length - 1], moisAtteinte, labels);
    phrase = "objectif de " + Math.round(objectif).toLocaleString("fr-FR") + " € atteint vers " + formaterLabelLong(f[f.length - 1]);
  } else {
    phrase = "objectif non atteint dans les 50 prochaines années";
  }
  ecrire("Hypothèse : " + Math.round(epargneAn).toLocaleString("fr-FR") + " €/an d'épargne (carte FIRE) et " + fmtTaux +
    " de rendement annuel supposé → " + phrase + ". Simple scénario avec tes propres chiffres, ni prévision ni conseil." +
    (projectionRate > 0 ? " Attention : cette épargne annuelle inclut déjà une part de performance passée, le rendement peut donc être compté deux fois." : ""));

  return {
    labels: labels.concat(futurs),
    actuel: valeurs.concat(futurs.map(() => null)),
    projection: valeurs.map((x, i) => (i === valeurs.length - 1 ? x : null)).concat(serieAffichee),
    nbActuel: valeurs.length,
  };
}

function majBoutonsProjection() {
  document.querySelectorAll("#projectionControls [data-rate]").forEach((btn) => {
    const r = btn.getAttribute("data-rate");
    const actif = projectionRate === null ? r === "off" : parseFloat(r) === projectionRate;
    btn.classList.toggle("active", actif);
    btn.setAttribute("aria-pressed", actif ? "true" : "false");
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const ctrl = document.getElementById("projectionControls");
  if (!ctrl) return;
  majBoutonsProjection();
  // La hero-card est cliquable (ouvre/ferme le detail) : on bloque la
  // propagation, comme pour le selecteur de periode.
  ctrl.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-rate]");
    if (!btn) return;
    e.stopPropagation();
    const r = btn.getAttribute("data-rate");
    projectionRate = r === "off" ? null : parseFloat(r);
    try { localStorage.setItem(PROJECTION_KEY, r); } catch (err) { /* stockage indisponible */ }
    majBoutonsProjection();
    applyPatrimoinePeriod(currentPatrimoinePeriod);
  });
  ctrl.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); });
});

function updatePatrimoineChart(labels, valeurs, objectifCible) {

    lastPatrimoine.labels = labels || [];
    lastPatrimoine.valeurs = valeurs || [];
    if (typeof objectifCible === "number" && objectifCible > 0) {
        lastPatrimoine.objectif = objectifCible;
    }

    const chartElement = document.querySelector("#heroSparkline");
    if (!chartElement) return;
    if (patrimoineChart) patrimoineChart.destroy();

    // Alternative textuelle au graphique (lecteurs d'ecran) : premier et
    // dernier point de la periode affichee.
    try {
        const pts = (valeurs || []).map((v, i) => ({ v: v, i: i })).filter((p) => p.v > 0);
        if (pts.length >= 2) {
            const a = pts[0], b = pts[pts.length - 1];
            const fmtE = (x) => Math.round(x).toLocaleString("fr-FR") + " euros";
            chartElement.setAttribute("aria-label",
                "Évolution du patrimoine : de " + fmtE(a.v) + " (" + formaterLabelLong(labels[a.i], labels, a.i) + ") à " +
                fmtE(b.v) + " (" + formaterLabelLong(labels[b.i], labels, b.i) + ")");
        }
    } catch (e) { /* alternative textuelle non critique */ }
    const reduireMouvement = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // La ligne "Objectif" (250k) a ete retiree du trace : elle forcait
    // l'axe vertical a couvrir 50k-250k, ecrasant la vraie courbe (70k-95k)
    // dans le tiers bas du graphique. L'objectif reste visible ailleurs
    // (FIRE Tracker, carte objectif Patrimoine) ; ici l'axe s'auto-adapte
    // aux vraies valeurs pour mieux voir la progression mois par mois.

    // Couleur de la courbe alignee sur la vraie tendance (1er vs dernier
    // point valide de la tranche affichee), pas fixe - coherent avec le
    // badge de variation et le halo du hero qui suivent deja cette meme
    // logique (cf. afficherVariationPeriode plus bas).
    const pointsValides = (valeurs || []).filter((v) => v && v > 0);
    const enHausse = pointsValides.length < 2 || pointsValides[pointsValides.length - 1] >= pointsValides[0];
    const couleurTendance = enHausse ? getStatusColor("positive") : getStatusColor("negative");

    // Peu de points (periodes courtes 1J/1M) : une courbe lissee sur 2-3
    // points invente une inflexion qui n'existe pas - lignes droites
    // plus honnetes que "smooth" dans ce cas.
    const courbe = (valeurs || []).length <= 3 ? "straight" : "smooth";

    // Projection optionnelle (chantier 5) : 2e serie en pointille, labels
    // futurs ajoutes. Sans projection : comportement identique a avant.
    const proj = construireProjection(labels, valeurs, lastPatrimoine.objectif);
    if (proj) labels = proj.labels;
    const nbActuel = proj ? proj.nbActuel : (labels || []).length;

    const options = {
        chart: {
            type: "area",
            height: 260,
            background: "transparent",
            toolbar: { show: false },
            animations: {
                enabled: !reduireMouvement,
                easing: "easeinout",
                speed: 1200
            }
        },

        series: proj
            ? [{ name: "Patrimoine", data: proj.actuel }, { name: "Projection", data: proj.projection }]
            : [{ name: "Patrimoine", data: valeurs }],

        colors: proj ? [couleurTendance, couleurTendance] : [couleurTendance],

        stroke: proj
            ? { curve: "smooth", width: [2.5, 2], dashArray: [0, 6] }
            : { curve: courbe, width: 2.5 },

        legend: { show: false },

        fill: proj ? {
            type: ["gradient", "solid"],
            opacity: [1, 0],
            gradient: { shade: "dark", shadeIntensity: 0.3, opacityFrom: 0.22, opacityTo: 0.02, stops: [0, 100] }
        } : {
            type: "gradient",
            gradient: {
                shade: "dark",
                shadeIntensity: 0.3,
                opacityFrom: 0.22,
                opacityTo: 0.02,
                stops: [0, 100]
            }
        },

        markers: {
            size: 0,
            strokeWidth: 2,
            hover: { size: 6 }
        },

        dataLabels: { enabled: false },

        grid: {
            borderColor: getCssVar("--border-color", "rgba(255,255,255,0.06)", "rgba(15,23,42,0.07)"),
            strokeDashArray: 0,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } }
        },

        xaxis: {
            categories: labels,
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: { enabled: false },
            labels: {
                rotate: 0,
                hideOverlappingLabels: true,
                style: { colors: getChartMutedColor() },
                // Un libelle sur "pas" (toujours le dernier point), le
                // reste est masque : evite le chevauchement.
                formatter: function (value, timestamp, opts) {
                    const total = (labels || []).length;
                    // Pour un axe "category", Apex ne fournit pas l'index
                    // (opts vide) : on le retrouve par la valeur du label.
                    const i = (labels || []).indexOf(value);
                    if (i < 0 || total <= 1) return formaterLabelAxe(value, labels, i);
                    const pas = Math.max(1, Math.ceil(total / maxLibellesAxe()));
                    const dernier = total - 1;
                    const visible = i === dernier || (i % pas === 0 && dernier - i >= Math.ceil(pas / 2));
                    return visible ? formaterLabelAxe(value, labels, i) : "";
                }
            }
        },

        yaxis: Object.assign({
            labels: {
                style: { colors: getChartMutedColor() },
                formatter: value =>
                    Math.round(value).toLocaleString("fr-FR") + " €"
            }
        }, proj ? {
            // Avec la projection l'axe peut retomber a 0 et ecraser la
            // partie reelle : on le borne sous la plus petite valeur reelle.
            min: Math.floor((Math.min.apply(null, pointsValides) * 0.9) / 10000) * 10000,
            forceNiceScale: true
        } : {}),

        tooltip: {
            theme: getThemeMode(),
            x: {
                formatter: function (value, opts) {
                    const i = opts && typeof opts.dataPointIndex === "number" ? opts.dataPointIndex : -1;
                    const brut = i >= 0 && labels ? labels[i] : value;
                    return (i >= nbActuel ? "Projection · " : "") + formaterLabelLong(brut, labels, i);
                }
            },
            y: {
                formatter: value =>
                    Math.round(value).toLocaleString("fr-FR") + " €"
            }
        },

        theme: { mode: getThemeMode() }
    };

    patrimoineChart = new ApexCharts(chartElement, options);
    patrimoineChart.render();
}

/* ==================================================
   SELECTEUR DE PERIODE — graphique Evolution du patrimoine
   Les points du Sheet Evolution sont poses au rythme des mises
   a jour de l'utilisateur (typiquement mensuel), pas au jour le
   jour : les periodes courtes (3M/6M/1A) filtrent donc par NOMBRE
   DE POINTS (les N derniers releves), pas par duree calendaire
   exacte - plus honnete que de pretendre une granularite
   journaliere que la donnee source n'a pas. YTD et Tout, eux,
   s'appuient sur la vraie date quand elle est reconnaissable.
   ================================================== */

const MOIS_FR_INDEX = {
    "janvier": 0, "février": 1, "fevrier": 1, "mars": 2, "avril": 3, "mai": 4, "juin": 5,
    "juillet": 6, "août": 7, "aout": 7, "septembre": 8, "octobre": 9, "novembre": 10, "décembre": 11, "decembre": 11
};

/* Essaie plusieurs formats couramment utilises dans les Sheets (label texte
   "Mars 2026", "03/2026", "2026-03", date complete...). Retourne un objet
   Date ou null si aucun format reconnu - les appelants degradent alors
   proprement (bouton masque / repli sur l'historique complet). */
function parseLabelDate(label) {
    if (!label) return null;
    const s = label.toString().trim().toLowerCase();

    let m = s.match(/^([a-zàâéèêëîïôûù]+)\s+(\d{4})$/i);
    if (m && MOIS_FR_INDEX[m[1]] !== undefined) {
        return new Date(parseInt(m[2], 10), MOIS_FR_INDEX[m[1]], 1);
    }

    m = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (m) return new Date(parseInt(m[2], 10), parseInt(m[1], 10) - 1, 1);

    m = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
    if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, 1);

    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));

    const parsed = Date.parse(label);
    return isNaN(parsed) ? null : new Date(parsed);
}

/* Remplace l'historique complet (appele une fois par chargement de donnees)
   et redessine avec la periode actuellement selectionnee. */
function setPatrimoineHistory(labels, valeurs, objectifCible) {
    patrimoineHistoryFull.labels = labels || [];
    patrimoineHistoryFull.valeurs = valeurs || [];
    if (typeof objectifCible === "number" && objectifCible > 0) {
        patrimoineHistoryFull.objectif = objectifCible;
    }
    applyPatrimoinePeriod(currentPatrimoinePeriod);
}
window.setPatrimoineHistory = setPatrimoineHistory;

/* Met a jour uniquement l'objectif (connu plus tard, apres parsing de la
   Sheet Objectif) sans re-fetcher/re-trancher l'historique. */
function updatePatrimoineObjectif(objectifCible) {
    if (typeof objectifCible === "number" && objectifCible > 0) {
        patrimoineHistoryFull.objectif = objectifCible;
    }
    applyPatrimoinePeriod(currentPatrimoinePeriod);
}
window.updatePatrimoineObjectif = updatePatrimoineObjectif;

// N+1 points par periode (et pas N) : une periode "X mois" doit comparer
// le point d'il y a X mois AU point actuel, donc inclure les 2 bornes -
// avec seulement N points, "1M" par exemple n'aurait que le point actuel
// et rien a comparer (badge de variation vide).
const PATRIMOINE_PERIODES_POINTS = { "1M": 2, "2M": 3, "3M": 4, "6M": 7, "1A": 13 };

/* ==================================================
   DERNIERE VISITE — periode "1J"
   Le Sheet Evolution n'a qu'un point par mise a jour manuelle
   (typiquement mensuelle) : impossible d'en tirer un vrai "hier"
   honnete. "1J" compare donc simplement la valeur du Patrimoine Total
   lors de la PRECEDENTE fois ou le dashboard a ete ouvert a la valeur
   actuelle - peu importe si c'etait il y a 2h ou 3 jours, c'est ce qui
   est reellement mesurable cote client. derniereVisitePatrimoine est
   lu une fois au chargement (avant d'etre ecrase par
   enregistrerVisitePatrimoine, appelee depuis googleSheets.js) puis
   reste stable pour le reste de la session.
   ================================================== */
const LAST_VISIT_KEY = "financeDashboard_lastVisitPatrimoine";
let derniereVisitePatrimoine = null;

function enregistrerVisitePatrimoine(valeurActuelle) {
    if (!valeurActuelle || valeurActuelle <= 0) return;
    try {
        const raw = localStorage.getItem(LAST_VISIT_KEY);
        derniereVisitePatrimoine = raw ? JSON.parse(raw) : null;
    } catch (e) {
        derniereVisitePatrimoine = null;
    }
    try {
        localStorage.setItem(LAST_VISIT_KEY, JSON.stringify({ valeur: valeurActuelle, date: new Date().toISOString() }));
    } catch (e) { /* quota depasse, pas bloquant */ }
}
window.enregistrerVisitePatrimoine = enregistrerVisitePatrimoine;

/* Redessine chart + sparkline + badge de variation + halo + etat actif
   des boutons pour une tranche (labels, valeurs) donnee - factorise les
   deux sources possibles (historique mensuel du Sheet vs comparaison
   "derniere visite" pour 1J). */
function renderPatrimoinePeriodSlice(labels, valeurs, objectif, periode, historiqueInsuffisant) {
    currentPatrimoinePeriod = periode;
    try { localStorage.setItem("patrimoinePeriod", periode); } catch (e) { /* stockage indisponible, pas bloquant */ }

    updatePatrimoineChart(labels, valeurs, objectif);

    if (historiqueInsuffisant) {
        const el = document.getElementById("patrimoinePeriodVariation");
        if (el) {
            el.className = "period-variation";
            el.textContent = "Pas encore de visite précédente enregistrée pour comparer.";
        }
        const heroCardEl = document.getElementById("heroCard");
        if (heroCardEl) heroCardEl.classList.remove("hero-card-down");
    } else {
        afficherVariationPeriode(labels, valeurs);
    }

    // querySelectorAll("[data-period]") plutot qu'un id precis : le
    // controle existe une seule fois dans le DOM (hero-card), mais
    // cette ecriture generique evite une re-casse silencieuse si un
    // second selecteur est reintroduit plus tard ailleurs.
    document.querySelectorAll(".period-selector [data-period]").forEach((btn) => {
        const actif = btn.getAttribute("data-period") === periode;
        btn.classList.toggle("active", actif);
        btn.setAttribute("aria-pressed", actif ? "true" : "false");
    });
}

function applyPeriode1J() {
    const objectif = patrimoineHistoryFull.objectif;
    const valeursConnues = patrimoineHistoryFull.valeurs || [];
    // Le dernier point de l'historique Evolution est deja ecrase par la
    // vraie valeur DATA.patrimoine en temps reel (cf. googleSheets.js) -
    // fiable a reutiliser ici comme "valeur actuelle" sans dupliquer de
    // variable globale supplementaire.
    const valeurActuelle = valeursConnues.length ? valeursConnues[valeursConnues.length - 1] : null;

    if (!derniereVisitePatrimoine || !derniereVisitePatrimoine.valeur || !valeurActuelle) {
        renderPatrimoinePeriodSlice([], [], objectif, "1J", true);
        return;
    }

    const dateVisite = new Date(derniereVisitePatrimoine.date);
    const labelVisite = dateVisite.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) +
        " " + dateVisite.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    renderPatrimoinePeriodSlice([labelVisite, "Maintenant"], [derniereVisitePatrimoine.valeur, valeurActuelle], objectif, "1J");
}

function applyPatrimoinePeriod(periode) {
    if (periode === "1J") {
        applyPeriode1J();
        afficherGainMarche(null); // pas de decomposition sur "depuis la derniere visite"
        return;
    }

    const { labels, valeurs, objectif } = patrimoineHistoryFull;
    if (!labels || !labels.length) return;

    let startIndex = 0;
    if (periode === "YTD") {
        const anneeActuelle = new Date().getFullYear();
        const idx = labels.findIndex((lbl) => {
            const d = parseLabelDate(lbl);
            return d && d.getFullYear() === anneeActuelle;
        });
        startIndex = idx >= 0 ? idx : 0;
    } else if (PATRIMOINE_PERIODES_POINTS[periode]) {
        startIndex = Math.max(0, labels.length - PATRIMOINE_PERIODES_POINTS[periode]);
    }

    const labelsSlice = labels.slice(startIndex);
    const valeursSlice = valeurs.slice(startIndex);

    // Un seul controle pilote les deux vues : la sparkline compacte du
    // hero (toujours visible) et le graphique complet d'Evolution du
    // patrimoine (visible une fois Graphiques deplie) refletent
    // desormais la meme periode selectionnee, au lieu de la sparkline
    // hero figee sur l'historique complet.
    renderPatrimoinePeriodSlice(labelsSlice, valeursSlice, objectif, periode);
    afficherGainMarche(startIndex);
}
window.applyPatrimoinePeriod = applyPatrimoinePeriod;

function afficherVariationPeriode(labels, valeurs) {
    const el = document.getElementById("patrimoinePeriodVariation");
    const heroCardEl = document.getElementById("heroCard");

    const pointsValides = [];
    for (let i = 0; i < valeurs.length; i++) {
        if (valeurs[i] && valeurs[i] > 0) pointsValides.push({ valeur: valeurs[i], label: labels[i] });
    }
    if (pointsValides.length < 2) {
        if (el) el.textContent = "";
        if (heroCardEl) heroCardEl.classList.remove("hero-card-down");
        return;
    }

    const premier = pointsValides[0];
    const dernier = pointsValides[pointsValides.length - 1];
    const deltaAbs = dernier.valeur - premier.valeur;
    const deltaPct = premier.valeur > 0 ? (deltaAbs / premier.valeur) * 100 : 0;
    const signe = deltaPct >= 0 ? "+" : "";

    if (el) {
        el.className = "period-variation " + (deltaPct >= 0 ? "up" : "down");
        el.textContent = (deltaPct >= 0 ? "▲ " : "▼ ") + signe + deltaPct.toFixed(1) + "% (" + signe +
            Math.round(deltaAbs).toLocaleString("fr-FR") + " €) depuis " + formaterLabelAxe(premier.label);
    }

    // Le halo ambiant de la hero-card reagit a la tendance de la periode
    // AFFICHEE (teal en croissance, ambre discret en repli) - signal
    // honnete plutot que purement decoratif (voir heroGlowBreathe dans
    // style.css). Suit desormais le meme badge que celui affiche, plutot
    // qu'un calcul separe fige sur les 2 derniers points du Sheet.
    if (heroCardEl) heroCardEl.classList.toggle("hero-card-down", deltaPct < 0);
}

document.addEventListener("DOMContentLoaded", function () {
    const selecteur = document.getElementById("patrimoinePeriodSelector");
    if (!selecteur) return;
    // Le selecteur vit dans la hero-card, elle-meme cliquable (ouvre/
    // ferme le detail Cash/PEA/CTO) - sans stopPropagation sur le clic
    // ET la touche Entree/Espace, choisir une periode ouvrirait/
    // fermerait aussi ce panneau (les deux evenements bubblent
    // independamment jusqu'a la hero-card).
    selecteur.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-period]");
        if (!btn) return;
        e.stopPropagation();
        applyPatrimoinePeriod(btn.getAttribute("data-period"));
    });
    selecteur.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") e.stopPropagation();
    });
});

function updateAllocationChart(cash, pea, cto, patrimoineTotal) {

    lastAllocation.cash = cash || 0;
    lastAllocation.pea = pea || 0;
    lastAllocation.cto = cto || 0;
    lastAllocation.patrimoineTotal = patrimoineTotal || 0;

    const chartElement = document.querySelector("#allocationChart");
    if (!chartElement) return;
    if (allocationChart) allocationChart.destroy();
    // Utilise patrimoine_total du Sheet (même source que la carte hero)
    // plutôt que cash+pea+cto recalculé, pour éviter toute divergence
    // liée à des arrondis ou à un taux de change légèrement différent.
    const total = patrimoineTotal || (cash + pea + cto);
    const options = {
        chart: {
            type: "donut",
            // 300px = hauteur du conteneur (.chart). Avant : 420/320, ce qui
            // depassait du conteneur et rognait le bas du donut + la legende.
            height: 300,
            background: "transparent",
            events: {
                // Clic sur une part du donut -> ouvre et scroll vers la
                // carte du compte correspondant (reutilise le systeme
                // d'accordeon existant en simulant le clic utilisateur,
                // plutot que de dupliquer sa logique d'ouverture ici).
                dataPointSelection: function (event, chartContext, config) {
                    const idsParIndex = ["cashAccountCard", "peaAccountCard", "ctoAccountCard"];
                    const card = document.getElementById(idsParIndex[config.dataPointIndex]);
                    if (!card) return;
                    if (card.getAttribute("aria-expanded") !== "true") card.click();
                    card.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }
        },

        series: [cash, pea, cto],

        labels: ["Cash", "PEA", "CTO"],

        colors: getMonoPalette(3),

        stroke: { colors: [getChartStrokeColor()], width: 2 },

        fill: {
            type: "gradient",
            gradient: { shade: "dark", type: "diagonal1", shadeIntensity: 0.15, opacityFrom: 1, opacityTo: 0.92 }
        },

        legend: {
            position: "bottom",
            fontSize: "14px",
            labels: { colors: getChartTextColor() }
        },

        plotOptions: {
            pie: {
                donut: {
                    size: "60%",
                    labels: {
                        show: true,

                        name: {
                            show: true,
                            color: getChartMutedColor()
                        },

                        value: {
                            show: true,
                            color: getChartTextColor(),
                            fontWeight: 700
                        },

                        total: {
                            show: true,
                            label: "Patrimoine",
                            color: getChartMutedColor(),
                            formatter: () =>
                                Math.round(total).toLocaleString("fr-FR") + " €"
                        }
                    }
                }
            }
        },

        dataLabels: {
            enabled: true,
            formatter: value => value.toFixed(1) + "%"
        },

        tooltip: {
            theme: getThemeMode(),
            y: {
                formatter: value =>
                    Math.round(value).toLocaleString("fr-FR") + " €"
            }
        },

        responsive: [{
            breakpoint: 768,
            options: {
                chart: { height: 300 },
                legend: { position: "bottom" }
            }
        }],

        theme: { mode: getThemeMode() }
    };

    allocationChart = new ApexCharts(chartElement, options);
    allocationChart.render();
}

/* Composition PEA : Actions vs ETF */
function updatePeaCompositionChart(actions, etf) {

    lastPeaComposition.actions = actions || 0;
    lastPeaComposition.etf = etf || 0;

    updatePeaCompositionInto(actions, etf, "peaCompositionChart");
    updatePeaCompositionInto(actions, etf, "peaCompositionMiniChart");
}

/* Rendu effectif d'un donut PEA dans un conteneur donne - factorise entre
   le graphique complet (section Graphiques) et le mini-donut integre
   directement dans la carte compte PEA (moins de details, pas de legende,
   pour rester compact dans l'espace deja dense de la carte). */
function updatePeaCompositionInto(actions, etf, containerId) {
    const chartElement = document.querySelector("#" + containerId);
    if (!chartElement) return;
    if (peaCompositionCharts[containerId]) peaCompositionCharts[containerId].destroy();

    const mini = containerId !== "peaCompositionChart";

    const options = {
        chart: { type: "donut", height: mini ? 180 : 280, background: "transparent" },
        series: [actions, etf],
        labels: ["Actions", "ETF"],
        colors: getMonoPalette(2),
        stroke: { colors: [getChartStrokeColor()], width: 2 },
        fill: {
            type: "gradient",
            gradient: { shade: "dark", type: "diagonal1", shadeIntensity: 0.15, opacityFrom: 1, opacityTo: 0.92 }
        },
        legend: mini ? { show: false } : { position: "bottom", fontSize: "13px", labels: { colors: getChartTextColor() } },
        plotOptions: {
            pie: { donut: { size: "58%", labels: { show: true,
                name: { color: getChartMutedColor(), fontSize: mini ? "11px" : "14px" },
                value: { color: getChartTextColor(), fontSize: mini ? "14px" : "22px" },
                total: { show: true, label: "PEA", color: getChartMutedColor(),
                formatter: () => Math.round(actions + etf).toLocaleString("fr-FR") + " €" } } } }
        },
        dataLabels: { enabled: !mini, formatter: v => v.toFixed(0) + "%" },
        tooltip: { theme: getThemeMode(), y: { formatter: v => Math.round(v).toLocaleString("fr-FR") + " €" } },
        theme: { mode: getThemeMode() }
    };

    peaCompositionCharts[containerId] = new ApexCharts(chartElement, options);
    peaCompositionCharts[containerId].render();
}

/* Composition CTO : Actions vs ETF vs Crypto */
function updateCtoCompositionChart(actions, etf, crypto) {

    lastCtoComposition.actions = actions || 0;
    lastCtoComposition.etf = etf || 0;
    lastCtoComposition.crypto = crypto || 0;

    updateCtoCompositionInto(actions, etf, crypto, "ctoCompositionChart");
    updateCtoCompositionInto(actions, etf, crypto, "ctoCompositionMiniChart");
}

function updateCtoCompositionInto(actions, etf, crypto, containerId) {
    const chartElement = document.querySelector("#" + containerId);
    if (!chartElement) return;
    if (ctoCompositionCharts[containerId]) ctoCompositionCharts[containerId].destroy();

    const mini = containerId !== "ctoCompositionChart";

    const options = {
        chart: { type: "donut", height: mini ? 180 : 280, background: "transparent" },
        series: [actions, etf, crypto],
        labels: ["Actions", "ETF", "Crypto"],
        colors: getMonoPalette(3),
        stroke: { colors: [getChartStrokeColor()], width: 2 },
        fill: {
            type: "gradient",
            gradient: { shade: "dark", type: "diagonal1", shadeIntensity: 0.15, opacityFrom: 1, opacityTo: 0.92 }
        },
        legend: mini ? { show: false } : { position: "bottom", fontSize: "13px", labels: { colors: getChartTextColor() } },
        plotOptions: {
            pie: { donut: { size: "58%", labels: { show: true,
                name: { color: getChartMutedColor(), fontSize: mini ? "11px" : "14px" },
                value: { color: getChartTextColor(), fontSize: mini ? "14px" : "22px" },
                total: { show: true, label: "CTO", color: getChartMutedColor(),
                formatter: () => Math.round(actions + etf + crypto).toLocaleString("fr-FR") + " CHF" } } } }
        },
        dataLabels: { enabled: !mini, formatter: v => v.toFixed(0) + "%" },
        tooltip: { theme: getThemeMode(), y: { formatter: v => Math.round(v).toLocaleString("fr-FR") + " CHF" } },
        theme: { mode: getThemeMode() }
    };

    ctoCompositionCharts[containerId] = new ApexCharts(chartElement, options);
    ctoCompositionCharts[containerId].render();
}

/* Suivi mensuel : Revenus vs Dépenses (optionnel, API_BUDGET_MENSUEL) */
/* Suivi mensuel : Revenus vs Dépenses (optionnel, API_BUDGET_MENSUEL).
   containerId permet d'avoir un graphique distinct par annee (voir
   googleSheets.js : chaque annee comportant 2+ mois recoit sa propre
   carte depliable avec son propre graphique). */
function updateMonthlyBudgetChart(labels, revenus, depenses, containerId = "monthlyBudgetChart") {

    lastMonthlyBudgetByYear[containerId] = { labels: labels || [], revenus: revenus || [], depenses: depenses || [] };

    const chartElement = document.querySelector("#" + containerId);
    if (!chartElement) return;
    if (monthlyBudgetCharts[containerId]) monthlyBudgetCharts[containerId].destroy();

    // Detection de valeur exceptionnelle (ex: gros achat/depot ponctuel un
    // mois donne) : si la plus grande valeur ecrase largement toutes les
    // autres, on plafonne l'axe pour garder les autres mois lisibles.
    // La vraie valeur reste consultable au survol (tooltip non affecte
    // par le plafond visuel).
    const toutesValeurs = [...(revenus || []), ...(depenses || [])]
        .filter(v => v > 0)
        .sort((a, b) => b - a);
    let yaxisMax;
    if (toutesValeurs.length >= 2 && toutesValeurs[0] > toutesValeurs[1] * 2.5) {
        yaxisMax = Math.ceil((toutesValeurs[1] * 1.35) / 1000) * 1000;
    }

    const options = {
        chart: { type: "bar", height: 320, background: "transparent", toolbar: { show: false } },
        series: [
            { name: "Revenus", data: revenus },
            { name: "Dépenses", data: depenses }
        ],
        colors: [getStatusColor("positive"), getStatusColor("negative")],
        plotOptions: { bar: { columnWidth: "55%", borderRadius: 4, dataLabels: { position: "top" } } },
        dataLabels: {
            enabled: true,
            offsetY: -18,
            style: { fontSize: "11px", colors: [getChartMutedColor()] },
            background: { enabled: false },
            formatter: v => v ? Math.round(v / 1000).toLocaleString("fr-FR") + "k" : ""
        },
        grid: { borderColor: getCssVar("--border-color", "rgba(255,255,255,0.06)", "rgba(15,23,42,0.07)"), strokeDashArray: 4, xaxis: { lines: { show: false } } },
        legend: { position: "top", labels: { colors: getChartTextColor() } },
        xaxis: { categories: labels, labels: { style: { colors: getChartMutedColor() } } },
        yaxis: {
            max: yaxisMax,
            labels: { style: { colors: getChartMutedColor() }, formatter: v => Math.round(v).toLocaleString("fr-FR") + " €" }
        },
        tooltip: {
            theme: getThemeMode(),
            y: { formatter: v => Math.round(v).toLocaleString("fr-FR") + " €" }
        },
        theme: { mode: getThemeMode() }
    };

    monthlyBudgetCharts[containerId] = new ApexCharts(chartElement, options);
    monthlyBudgetCharts[containerId].render();
}

/* Sparklines des cartes PEA / CTO : même logique que le hero, mais
   masqués si aucune donnée historique par compte n'est disponible
   (nécessite des colonnes dédiées côté Sheet — voir googleSheets.js). */
let peaSparklineChart = null;
let ctoSparklineChart = null;

function updateAccountSparkline(elementId, chartRef, valeurs, deviseSuffixe) {
    const chartElement = document.querySelector("#" + elementId);
    if (!chartElement) return chartRef;
    const pointsValides = (valeurs || []).filter((v) => v !== null && v !== undefined && !isNaN(v) && v > 0);
    if (pointsValides.length < 2) {
        chartElement.style.display = "none";
        return chartRef;
    }
    if (chartRef) chartRef.destroy();
    chartElement.style.display = "";

    const positive = pointsValides[pointsValides.length - 1] >= pointsValides[0];
    const valMin = Math.min(...pointsValides);
    const valMax = Math.max(...pointsValides);
    const marge = (valMax - valMin) * 0.15 || Math.abs(valMax) * 0.05 || 1;

    const options = {
        chart: {
            type: "area",
            height: 40,
            sparkline: { enabled: true },
            animations: { enabled: true, speed: 800 }
        },
        series: [{ name: "Valeur", data: pointsValides }],
        colors: [positive ? "#2DD4A7" : "#F0576B"],
        stroke: { curve: "smooth", width: 2 },
        fill: {
            type: "gradient",
            gradient: { shadeIntensity: 0.6, opacityFrom: 0.35, opacityTo: 0, stops: [0, 100] }
        },
        yaxis: { min: valMin - marge, max: valMax + marge },
        tooltip: {
            theme: getThemeMode(),
            y: { formatter: v => Math.round(v).toLocaleString("fr-FR") + " " + deviseSuffixe }
        }
    };

    const newChart = new ApexCharts(chartElement, options);
    newChart.render();
    return newChart;
}

function updatePeaSparkline(valeurs) {
    lastPeaSeries.valeurs = valeurs || [];
    peaSparklineChart = updateAccountSparkline("peaSparkline", peaSparklineChart, valeurs, "€");
}

function updateCtoSparkline(valeurs) {
    lastCtoSeries.valeurs = valeurs || [];
    ctoSparklineChart = updateAccountSparkline("ctoSparkline", ctoSparklineChart, valeurs, "CHF");
}

/* Refresh charts using cached data (appelable après un changement de thème) */
function refreshCharts() {
  if (patrimoineHistoryFull.labels && patrimoineHistoryFull.labels.length) {
    // redessine le graphique ET la sparkline hero dans la periode
    // actuellement selectionnee (applyPatrimoinePeriod met a jour les
    // deux en une fois, cf. plus haut dans ce fichier).
    applyPatrimoinePeriod(currentPatrimoinePeriod);
  } else if (lastPatrimoine.labels && lastPatrimoine.labels.length) {
    updatePatrimoineChart(lastPatrimoine.labels, lastPatrimoine.valeurs, lastPatrimoine.objectif);
  }
  if (lastPeaSeries.valeurs && lastPeaSeries.valeurs.length) updatePeaSparkline(lastPeaSeries.valeurs);
  if (lastCtoSeries.valeurs && lastCtoSeries.valeurs.length) updateCtoSparkline(lastCtoSeries.valeurs);
  // même si les valeurs valent 0, on peut forcer la mise à jour
  updateAllocationChart(lastAllocation.cash, lastAllocation.pea, lastAllocation.cto, lastAllocation.patrimoineTotal);
  if (typeof window.refreshAssetMix === "function") window.refreshAssetMix();
  updatePeaCompositionChart(lastPeaComposition.actions, lastPeaComposition.etf);
  updateCtoCompositionChart(lastCtoComposition.actions, lastCtoComposition.etf, lastCtoComposition.crypto);
  Object.keys(lastMonthlyBudgetByYear).forEach((containerId) => {
    const d = lastMonthlyBudgetByYear[containerId];
    if (d.labels && d.labels.length) {
      updateMonthlyBudgetChart(d.labels, d.revenus, d.depenses, containerId);
    }
  });
}

/* rendre refreshCharts accessible globalement depuis les autres scripts */
window.refreshCharts = refreshCharts;
