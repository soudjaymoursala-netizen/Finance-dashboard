let patrimoineChart = null;
let allocationChart = null;

let lastPatrimoine = { labels: [], valeurs: [] };
let lastAllocation = { cash: 0, pea: 0, cto: 0 };

function getThemeMode() {
  return document && document.body && document.body.classList.contains("light") ? "light" : "dark";
}

function updatePatrimoineChart(labels, valeurs) {

    lastPatrimoine.labels = labels || [];
    lastPatrimoine.valeurs = valeurs || [];

    const chartElement = document.querySelector("#patrimoineChart");
    if (!chartElement) return;
    if (patrimoineChart) patrimoineChart.destroy();
    const objectifData = labels.map(() => 250000);
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
            { name: "Objectif 250k", data: objectifData }
        ],

        colors: ["#22c55e", "#94a3b8"],

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
            labels: { colors: "#ffffff" }
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
            "#5B6C84", // PEA
            "#D9A441"  // CTO
        ],

        legend: {
            position: "bottom",
            fontSize: "14px",
            labels: { colors: "#ffffff" }
        },

        plotOptions: {
            pie: {
                donut: {
                    size: "72%",
                    labels: {
                        show: true,

                        name: {
                            show: true,
                            color: "#5B6C84"
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
  // même si les valeurs valent 0, on peut forcer la mise à jour
  updateAllocationChart(lastAllocation.cash, lastAllocation.pea, lastAllocation.cto);
}

/* rendre refreshCharts accessible globalement depuis les autres scripts */
window.refreshCharts = refreshCharts;
