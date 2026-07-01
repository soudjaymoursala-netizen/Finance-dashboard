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

function getThemeMode() {
  return document && document.body && document.body.classList.contains("light") ? "light" : "dark";
}

/* Couleur de texte pour les légendes/labels ApexCharts, adaptée au thème
   (les couleurs de graphiques sont des hex litteraux, pas des variables CSS,
   donc il faut les recalculer manuellement selon le mode actif) */
function getChartTextColor() {
  return getThemeMode() === "light" ? "#0F172A" : "#F1F5F9";
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
    const objectifData = labels.map(() => lastPatrimoine.objectif);
    const options = {
        chart: {
            type: "area",
            height: 420,
            background: "transparent",
            toolbar: { show: false },
            animations: {
                enabled: true,
                easing: "easeinout",
                speed: 1200
            }
        },

        series: [
            { name: "Patrimoine", data: valeurs },
            { name: "Objectif " + Math.round(lastPatrimoine.objectif / 1000) + "k", data: objectifData }
        ],

        colors: ["#2DD4A7", "#8A94A6"],

        stroke: {
            curve: "smooth",
            width: [4, 3],
            dashArray: [0, 8]
        },

        fill: {
            type: ["gradient", "solid"],
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

        legend: {
            position: "top",
            labels: { colors: getChartTextColor() }
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

function updateAllocationChart(cash, pea, cto) {

    lastAllocation.cash = cash || 0;
    lastAllocation.pea = pea || 0;
    lastAllocation.cto = cto || 0;

    const chartElement = document.querySelector("#allocationChart");
    if (!chartElement) return;
    if (allocationChart) allocationChart.destroy();
    const total = cash + pea + cto;
    const options = {
        chart: {
            type: "donut",
            height: 420,
            background: "transparent"
        },

        series: [cash, pea, cto],

        labels: ["Cash", "PEA", "CTO"],

        colors: [
            "#4EC5CF", // Cash
            "#2DD4A7", // PEA
            "#F0B429"  // CTO
        ],

        legend: {
            position: "bottom",
            fontSize: "14px",
            labels: { colors: getChartTextColor() }
        },

        plotOptions: {
            pie: {
                donut: {
                    size: "72%",
                    labels: {
                        show: true,

                        name: {
                            show: true,
                            color: "#8A94A6"
                        },

                        value: {
                            show: true,
                            color: "#4EC5CF",
                            fontWeight: 700
                        },

                        total: {
                            show: true,
                            label: "Patrimoine",
                            color: "#4EC5CF",
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
        colors: ["#F0B429", "#4EC5CF"],
        legend: { position: "bottom", fontSize: "13px", labels: { colors: getChartTextColor() } },
        plotOptions: {
            pie: { donut: { size: "68%", labels: { show: true, total: { show: true, label: "PEA", color: "#4EC5CF",
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
        colors: ["#F0B429", "#4EC5CF", "#9F7AEA"],
        legend: { position: "bottom", fontSize: "13px", labels: { colors: getChartTextColor() } },
        plotOptions: {
            pie: { donut: { size: "68%", labels: { show: true, total: { show: true, label: "CTO", color: "#4EC5CF",
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
        yaxis: { labels: { style: { colors: "#94a3b8" }, formatter: v => Math.round(v).toLocaleString("fr-FR") + " €" } },
        tooltip: { theme: getThemeMode(), y: { formatter: v => Math.round(v).toLocaleString("fr-FR") + " €" } },
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
        tooltip: {
            theme: getThemeMode(),
            y: { formatter: v => Math.round(v).toLocaleString("fr-FR") + " €" }
        }
    };

    heroSparklineChart = new ApexCharts(chartElement, options);
    heroSparklineChart.render();
}

/* Refresh charts using cached data (appelable après un changement de thème) */
function refreshCharts() {
  if (lastPatrimoine.labels && lastPatrimoine.labels.length) {
    updatePatrimoineChart(lastPatrimoine.labels, lastPatrimoine.valeurs, lastPatrimoine.objectif);
    updateHeroSparkline(lastPatrimoine.valeurs);
  }
  // même si les valeurs valent 0, on peut forcer la mise à jour
  updateAllocationChart(lastAllocation.cash, lastAllocation.pea, lastAllocation.cto);
  updatePeaCompositionChart(lastPeaComposition.actions, lastPeaComposition.etf);
  updateCtoCompositionChart(lastCtoComposition.actions, lastCtoComposition.etf, lastCtoComposition.crypto);
  if (lastMonthlyBudget.labels && lastMonthlyBudget.labels.length) {
    updateMonthlyBudgetChart(lastMonthlyBudget.labels, lastMonthlyBudget.revenus, lastMonthlyBudget.depenses);
  }
}

/* rendre refreshCharts accessible globalement depuis les autres scripts */
window.refreshCharts = refreshCharts;
