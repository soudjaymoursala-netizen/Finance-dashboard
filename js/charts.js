let patrimoineChart = null;
let allocationChart = null;
let peaCompositionChart = null;
let ctoCompositionChart = null;
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

/* Couleur de texte pour les légendes/labels ApexCharts, adaptée au thème
   (les couleurs de graphiques sont des hex litteraux, pas des variables CSS,
   donc il faut les recalculer manuellement selon le mode actif) */
function getChartTextColor() {
  return getThemeMode() === "light" ? "#0F172A" : "#F1F5F9";
}

/* Couleurs de statut (positif/attention/info/negatif) adaptees au theme.
   Les teintes "mode sombre" (vives) tombaient a 1.9-3.3:1 de contraste
   sur fond blanc en mode clair (echec WCAG AA, seuil 4.5:1 pour du
   petit texte) - variantes assombries validees pour le mode clair. */
function getStatusColor(status) {
  const light = getThemeMode() === "light";
  const map = {
    positive: light ? "#0A8563" : "#2DD4A7",
    warning:  light ? "#9C5F00" : "#F5A623",
    info:     light ? "#0E7C8F" : "#4EC5CF",
    negative: light ? "#D6304A" : "#F0576B"
  };
  return map[status] || map.info;
}
window.getStatusColor = getStatusColor;

/* Couleur de contour des segments de donut : doit se fondre avec le fond
   de carte pour un rendu plus net (au lieu du blanc par defaut d'ApexCharts) */
function getChartStrokeColor() {
  return getThemeMode() === "light" ? "#FFFFFF" : "#141B2E";
}

function updatePatrimoineChart(labels, valeurs, objectifCible) {

    lastPatrimoine.labels = labels || [];
    lastPatrimoine.valeurs = valeurs || [];
    if (typeof objectifCible === "number" && objectifCible > 0) {
        lastPatrimoine.objectif = objectifCible;
    }

    const chartElement = document.querySelector("#patrimoineChart");
    if (!chartElement) return;
    if (patrimoineChart) patrimoineChart.destroy();
    // La ligne "Objectif" (250k) a ete retiree du trace : elle forcait
    // l'axe vertical a couvrir 50k-250k, ecrasant la vraie courbe (70k-95k)
    // dans le tiers bas du graphique. L'objectif reste visible ailleurs
    // (FIRE Tracker, carte objectif Patrimoine) ; ici l'axe s'auto-adapte
    // aux vraies valeurs pour mieux voir la progression mois par mois.
    const options = {
        chart: {
            type: "area",
            height: 380,
            background: "transparent",
            toolbar: { show: false },
            animations: {
                enabled: true,
                easing: "easeinout",
                speed: 1200
            }
        },

        series: [
            { name: "Patrimoine", data: valeurs }
        ],

        colors: ["#2DD4A7"],

        stroke: {
            curve: "smooth",
            width: 4
        },

        fill: {
            type: "gradient",
            gradient: {
                shade: "dark",
                shadeIntensity: 0.5,
                opacityFrom: 0.45,
                opacityTo: 0.03,
                stops: [0, 100]
            }
        },

        markers: {
            size: 5,
            strokeWidth: 2,
            hover: { size: 8 }
        },

        dataLabels: { enabled: false },

        grid: {
            borderColor: "#334155",
            strokeDashArray: 4
        },

        xaxis: {
            categories: labels,
            labels: {
                style: { colors: "#94a3b8" }
            }
        },

        yaxis: {
            labels: {
                style: { colors: "#94a3b8" },
                formatter: value =>
                    Math.round(value).toLocaleString("fr-FR") + " €"
            }
        },

        tooltip: {
            theme: getThemeMode(),
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

const PATRIMOINE_PERIODES_POINTS = { "3M": 3, "6M": 6, "1A": 12 };

function applyPatrimoinePeriod(periode) {
    const { labels, valeurs, objectif } = patrimoineHistoryFull;
    if (!labels || !labels.length) return;

    currentPatrimoinePeriod = periode;
    try { localStorage.setItem("patrimoinePeriod", periode); } catch (e) { /* stockage indisponible, pas bloquant */ }

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
    updatePatrimoineChart(labelsSlice, valeursSlice, objectif);
    updateHeroSparkline(valeursSlice, labelsSlice);
    afficherVariationPeriode(labelsSlice, valeursSlice);

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
window.applyPatrimoinePeriod = applyPatrimoinePeriod;

function afficherVariationPeriode(labels, valeurs) {
    const el = document.getElementById("patrimoinePeriodVariation");
    if (!el) return;

    const pointsValides = [];
    for (let i = 0; i < valeurs.length; i++) {
        if (valeurs[i] && valeurs[i] > 0) pointsValides.push({ valeur: valeurs[i], label: labels[i] });
    }
    if (pointsValides.length < 2) {
        el.textContent = "";
        return;
    }

    const premier = pointsValides[0];
    const dernier = pointsValides[pointsValides.length - 1];
    const deltaAbs = dernier.valeur - premier.valeur;
    const deltaPct = premier.valeur > 0 ? (deltaAbs / premier.valeur) * 100 : 0;
    const signe = deltaPct >= 0 ? "+" : "";

    el.className = "period-variation " + (deltaPct >= 0 ? "up" : "down");
    el.textContent = (deltaPct >= 0 ? "▲ " : "▼ ") + signe + deltaPct.toFixed(1) + "% (" + signe +
        Math.round(deltaAbs).toLocaleString("fr-FR") + " €) depuis " + premier.label;
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
            height: 420,
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

        colors: [
            "#1D8FA6", // Cash — teal profond
            "#178C6E", // PEA — émeraude profond
            "#B98527"  // CTO — bronze/or profond
        ],

        stroke: { colors: [getChartStrokeColor()], width: 2 },

        fill: {
            type: "gradient",
            gradient: { shade: "dark", type: "diagonal1", shadeIntensity: 0.35, opacityFrom: 1, opacityTo: 0.88 }
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
                            color: "#8A94A6"
                        },

                        value: {
                            show: true,
                            color: "#1D8FA6",
                            fontWeight: 700
                        },

                        total: {
                            show: true,
                            label: "Patrimoine",
                            color: "#1D8FA6",
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
                chart: { height: 320 },
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

    const chartElement = document.querySelector("#peaCompositionChart");
    if (!chartElement) return;
    if (peaCompositionChart) peaCompositionChart.destroy();

    const options = {
        chart: { type: "donut", height: 280, background: "transparent" },
        series: [actions, etf],
        labels: ["Actions", "ETF"],
        colors: ["#B98527", "#1D8FA6"],
        stroke: { colors: [getChartStrokeColor()], width: 2 },
        fill: {
            type: "gradient",
            gradient: { shade: "dark", type: "diagonal1", shadeIntensity: 0.35, opacityFrom: 1, opacityTo: 0.88 }
        },
        legend: { position: "bottom", fontSize: "13px", labels: { colors: getChartTextColor() } },
        plotOptions: {
            pie: { donut: { size: "58%", labels: { show: true, total: { show: true, label: "PEA", color: "#1D8FA6",
                formatter: () => Math.round(actions + etf).toLocaleString("fr-FR") + " €" } } } }
        },
        dataLabels: { enabled: true, formatter: v => v.toFixed(0) + "%" },
        tooltip: { theme: getThemeMode(), y: { formatter: v => Math.round(v).toLocaleString("fr-FR") + " €" } },
        theme: { mode: getThemeMode() }
    };

    peaCompositionChart = new ApexCharts(chartElement, options);
    peaCompositionChart.render();
}

/* Composition CTO : Actions vs ETF vs Crypto */
function updateCtoCompositionChart(actions, etf, crypto) {

    lastCtoComposition.actions = actions || 0;
    lastCtoComposition.etf = etf || 0;
    lastCtoComposition.crypto = crypto || 0;

    const chartElement = document.querySelector("#ctoCompositionChart");
    if (!chartElement) return;
    if (ctoCompositionChart) ctoCompositionChart.destroy();

    const options = {
        chart: { type: "donut", height: 280, background: "transparent" },
        series: [actions, etf, crypto],
        labels: ["Actions", "ETF", "Crypto"],
        colors: ["#B98527", "#1D8FA6", "#6C5CE0"],
        stroke: { colors: [getChartStrokeColor()], width: 2 },
        fill: {
            type: "gradient",
            gradient: { shade: "dark", type: "diagonal1", shadeIntensity: 0.35, opacityFrom: 1, opacityTo: 0.88 }
        },
        legend: { position: "bottom", fontSize: "13px", labels: { colors: getChartTextColor() } },
        plotOptions: {
            pie: { donut: { size: "58%", labels: { show: true, total: { show: true, label: "CTO", color: "#1D8FA6",
                formatter: () => Math.round(actions + etf + crypto).toLocaleString("fr-FR") + " CHF" } } } }
        },
        dataLabels: { enabled: true, formatter: v => v.toFixed(0) + "%" },
        tooltip: { theme: getThemeMode(), y: { formatter: v => Math.round(v).toLocaleString("fr-FR") + " CHF" } },
        theme: { mode: getThemeMode() }
    };

    ctoCompositionChart = new ApexCharts(chartElement, options);
    ctoCompositionChart.render();
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
        colors: ["#2DD4A7", "#F0576B"],
        plotOptions: { bar: { columnWidth: "55%", borderRadius: 4 } },
        dataLabels: { enabled: false },
        grid: { borderColor: "#334155", strokeDashArray: 4 },
        legend: { position: "top", labels: { colors: getChartTextColor() } },
        xaxis: { categories: labels, labels: { style: { colors: "#94a3b8" } } },
        yaxis: {
            max: yaxisMax,
            labels: { style: { colors: "#94a3b8" }, formatter: v => Math.round(v).toLocaleString("fr-FR") + " €" }
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

/* Sparkline dans la carte héros : tendance récente du patrimoine */
let heroSparklineChart = null;

function updateHeroSparkline(valeurs, labels) {
    const chartElement = document.querySelector("#heroSparkline");
    if (!chartElement || !valeurs || !valeurs.length) return;
    if (heroSparklineChart) heroSparklineChart.destroy();

    const positive = valeurs[valeurs.length - 1] >= valeurs[0];

    // Recalage de l'axe Y sur la plage reelle des valeurs (+ marge de
    // 15% de chaque cote) : sans ca, ApexCharts choisit une echelle qui
    // ecrase souvent une variation de quelques % en une ligne quasi
    // plate collee en bas du sparkline. Fallback si toutes les valeurs
    // sont identiques (plage nulle) pour eviter min === max.
    const valMin = Math.min(...valeurs);
    const valMax = Math.max(...valeurs);
    const marge = (valMax - valMin) * 0.15 || Math.abs(valMax) * 0.05 || 1;

    const options = {
        chart: {
            type: "area",
            height: 60,
            sparkline: { enabled: true },
            animations: { enabled: true, speed: 800 }
        },
        series: [{ name: "Patrimoine", data: valeurs }],
        colors: [positive ? "#2DD4A7" : "#F0576B"],
        stroke: { curve: "smooth", width: 2.5 },
        fill: {
            type: "gradient",
            gradient: { shadeIntensity: 0.6, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] }
        },
        yaxis: { min: valMin - marge, max: valMax + marge },
        xaxis: { categories: labels || [] },
        // Suivre le doigt/curseur plutot que de se figer sur le point le
        // plus proche : sensation de "glisser sur la courbe" comme dans
        // Apple Stocks/Robinhood, plutot qu'un simple survol statique.
        tooltip: {
            theme: getThemeMode(),
            followCursor: true,
            x: { show: true },
            y: { formatter: v => Math.round(v).toLocaleString("fr-FR") + " €" }
        }
    };

    heroSparklineChart = new ApexCharts(chartElement, options);
    heroSparklineChart.render();
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
    updateHeroSparkline(lastPatrimoine.valeurs);
  }
  if (lastPeaSeries.valeurs && lastPeaSeries.valeurs.length) updatePeaSparkline(lastPeaSeries.valeurs);
  if (lastCtoSeries.valeurs && lastCtoSeries.valeurs.length) updateCtoSparkline(lastCtoSeries.valeurs);
  // même si les valeurs valent 0, on peut forcer la mise à jour
  updateAllocationChart(lastAllocation.cash, lastAllocation.pea, lastAllocation.cto, lastAllocation.patrimoineTotal);
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
