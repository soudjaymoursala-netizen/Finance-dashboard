let patrimoineChart = null;
let allocationChart = null;

let lastPatrimoine = { labels: [], valeurs: [] };
let lastAllocation = { cash: 0, pea: 0, cto: 0 };

function getThemeMode() {
  return document && document.body && document.body.classList.contains("light") ? "light" : "dark";
}

function movingAverage(series, window = 3) {
  if (!series || series.length === 0) return [];
  const result = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    result.push(avg);
  }
  return result;
}

function updatePatrimoineChart(labels, valeurs) {

    lastPatrimoine.labels = labels || [];
    lastPatrimoine.valeurs = valeurs || [];

    const chartElement = document.querySelector("#patrimoineChart");
    if (!chartElement) return;
    if (patrimoineChart) patrimoineChart.destroy();

    const objectifData = labels.map(() => 250000);
    const movingAvgData = movingAverage(valeurs, 3);

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
            { name: "Moyenne 3M", data: movingAvgData },
            { name: "Objectif 250k", data: objectifData }
        ],

        colors: ["#22c55e", "#3b82f6", "#94a3b8"],

        stroke: {
            curve: "smooth",
            width: [4, 2, 3],
            dashArray: [0, 0, 8]
        },

        fill: {
            type: ["gradient", "solid", "solid"],
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
            labels: { colors: getThemeMode() === "light" ? "#1f2937" : "#ffffff" }
        },

        xaxis: {
            categories: labels,
            labels: {
                style: { colors: getThemeMode() === "light" ? "#4b5563" : "#94a3b8" }
            }
        },

        yaxis: {
            labels: {
                style: { colors: getThemeMode() === "light" ? "#4b5563" : "#94a3b8" },
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
            "#5B6C84", // PEA
            "#D9A441"  // CTO
        ],

        legend: {
            position: "bottom",
            fontSize: "14px",
            labels: { colors: getThemeMode() === "light" ? "#1f2937" : "#ffffff" }
        },

        plotOptions: {
            pie: {
                donut: {
                    size: "72%",
                    labels: {
                        show: true,

                        name: {
                            show: true,
                            color: getThemeMode() === "light" ? "#4b5563" : "#5B6C84"
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

/* Refresh charts using cached data (appelable après un changement de thème) */
function refreshCharts() {
  if (lastPatrimoine.labels && lastPatrimoine.labels.length) {
    updatePatrimoineChart(lastPatrimoine.labels, lastPatrimoine.valeurs);
  }
  updateAllocationChart(lastAllocation.cash, lastAllocation.pea, lastAllocation.cto);
}

/* rendre refreshCharts accessible globalement depuis les autres scripts */
window.refreshCharts = refreshCharts;
