let patrimoineChart = null;
let allocationChart = null;

function updatePatrimoineChart(labels, valeurs) {

    const chartElement =
        document.querySelector("#patrimoineChart");

    if (!chartElement) return;

    if (patrimoineChart) {
        patrimoineChart.destroy();
    }

    const options = {

        chart: {
            type: "area",
            height: 350,
            toolbar: {
                show: false
            },
            background: "transparent"
        },

        series: [{
            name: "Patrimoine",
            data: valeurs
        }],

        xaxis: {
            categories: labels,
            labels: {
                style: {
                    colors: "#94a3b8"
                }
            }
        },

        yaxis: {
            labels: {
                style: {
                    colors: "#94a3b8"
                },
                formatter: function(value) {
                    return Math.round(value)
                        .toLocaleString("fr-FR") + " €";
                }
            }
        },

        stroke: {
            curve: "smooth",
            width: 4
        },

        colors: ["#22c55e"],

        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.05
            }
        },

        dataLabels: {
            enabled: true
        },

        tooltip: {
            y: {
                formatter: function(value) {
                    return Math.round(value)
                        .toLocaleString("fr-FR") + " €";
                }
            }
        },

        theme: {
            mode: "dark"
        },

        grid: {
            borderColor: "#334155"
        }
    };

    patrimoineChart =
        new ApexCharts(chartElement, options);

    patrimoineChart.render();
}

function updateAllocationChart(cash, pea, cto) {

    const chartElement =
        document.querySelector("#allocationChart");

    if (!chartElement) return;

    if (allocationChart) {
        allocationChart.destroy();
    }

    const options = {

        chart: {
            type: "donut",
            height: 350,
            background: "transparent"
        },

        series: [
            cash,
            pea,
            cto
        ],

        labels: [
            "Cash",
            "PEA",
            "CTO"
        ],

        colors: [
            "#22c55e",
            "#3b82f6",
            "#f59e0b"
        ],

        legend: {
            position: "bottom",
            labels: {
                colors: "#ffffff"
            }
        },

        tooltip: {
            y: {
                formatter: function(value) {
                    return Math.round(value)
                        .toLocaleString("fr-FR") + " €";
                }
            }
        },

        theme: {
            mode: "dark"
        }
    };

    allocationChart =
        new ApexCharts(chartElement, options);

    allocationChart.render();
}
