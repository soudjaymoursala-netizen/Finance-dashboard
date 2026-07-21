let patrimoineChart = null;
let allocationChart = null;
let peaCompositionChart = null;
let ctoCompositionChart = null;
let monthlyBudgetChart = null;

let lastPatrimoine = { labels: [], valeurs: [], objectif: 250000 };
let lastAllocation = { cash: 0, pea: 0, cto: 0 };
let lastPeaComposition = { actions: 0, etf: 0 };
let lastCtoComposition = { actions: 0, etf: 0, crypto: 0 };
let lastMonthlyBudget = { labels: [], revenus: [], depenses: [] };
let lastPeaSeries = { valeurs: [] };
let lastCtoSeries = { valeurs: [] };

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
            background: "transparent"
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
function updateMonthlyBudgetChart(labels, revenus, depenses) {

    lastMonthlyBudget.labels = labels || [];
    lastMonthlyBudget.revenus = revenus || [];
    lastMonthlyBudget.depenses = depenses || [];

    const chartElement = document.querySelector("#monthlyBudgetChart");
    if (!chartElement) return;
    if (monthlyBudgetChart) monthlyBudgetChart.destroy();

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

    monthlyBudgetChart = new ApexCharts(chartElement, options);
    monthlyBudgetChart.render();
}

/* Sparkline dans la carte héros : tendance récente du patrimoine */
let heroSparklineChart = null;

function updateHeroSparkline(valeurs) {
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
        tooltip: {
            theme: getThemeMode(),
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
  if (lastPatrimoine.labels && lastPatrimoine.labels.length) {
    updatePatrimoineChart(lastPatrimoine.labels, lastPatrimoine.valeurs, lastPatrimoine.objectif);
    updateHeroSparkline(lastPatrimoine.valeurs);
  }
  if (lastPeaSeries.valeurs && lastPeaSeries.valeurs.length) updatePeaSparkline(lastPeaSeries.valeurs);
  if (lastCtoSeries.valeurs && lastCtoSeries.valeurs.length) updateCtoSparkline(lastCtoSeries.valeurs);
  // même si les valeurs valent 0, on peut forcer la mise à jour
  updateAllocationChart(lastAllocation.cash, lastAllocation.pea, lastAllocation.cto, lastAllocation.patrimoineTotal);
  updatePeaCompositionChart(lastPeaComposition.actions, lastPeaComposition.etf);
  updateCtoCompositionChart(lastCtoComposition.actions, lastCtoComposition.etf, lastCtoComposition.crypto);
  if (lastMonthlyBudget.labels && lastMonthlyBudget.labels.length) {
    updateMonthlyBudgetChart(lastMonthlyBudget.labels, lastMonthlyBudget.revenus, lastMonthlyBudget.depenses);
  }
}

/* rendre refreshCharts accessible globalement depuis les autres scripts */
window.refreshCharts = refreshCharts;
