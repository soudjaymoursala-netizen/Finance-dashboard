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
            height: 420,
            background: "transparent",

            toolbar: {
                show: false
            },

            animations: {
                enabled: true,
                easing: "easeinout",
                speed: 1200
            }
        },

        series: [{
            name: "Patrimoine",
            data: valeurs
        }],

        colors: [
            "#22c55e"
        ],

        stroke: {
            curve: "smooth",
            width: 4
        },

        fill: {

            type: "gradient",

            gradient: {

                shade: "dark",

                type: "vertical",

                shadeIntensity: 0.4,

                opacityFrom: 0.45,

                opacityTo: 0.03,

                stops: [0, 100]
            }
        },

        markers: {

            size: 5,

            colors: ["#22c55e"],

            strokeColors: "#ffffff",

            strokeWidth: 2,

            hover: {
                size: 8
            }
        },

        dataLabels: {
            enabled: false
        },

        grid: {

            borderColor: "#334155",

            strokeDashArray: 5
        },

        xaxis: {

            categories: labels,

            labels: {

                style: {

                    colors: "#94a3b8",

                    fontSize: "12px"
                }
            }
        },

        yaxis: {

            labels: {

                style: {

                    colors: "#94a3b8"
                },

                formatter: function (value) {

                    return (
                        Math.round(value)
                            .toLocaleString("fr-FR")
                        + " €"
                    );

                }
            }
        },

        tooltip: {

            theme: "dark",

            y: {

                formatter: function (value) {

                    return (
                        Math.round(value)
                            .toLocaleString("fr-FR")
                        + " €"
                    );

                }
            }
        },

        theme: {
            mode: "dark"
        }
    };

    patrimoineChart =
        new ApexCharts(
            chartElement,
            options
        );

    patrimoineChart.render();
}

function updateAllocationChart(
    cash,
    pea,
    cto
) {

    const chartElement =
        document.querySelector(
            "#allocationChart"
        );

    if (!chartElement) return;

    if (allocationChart) {

        allocationChart.destroy();

    }

    const total =
        cash + pea + cto;

    const options = {

        chart: {

            type: "donut",

            height: 420,

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

            fontSize: "14px",

            labels: {
                colors: "#ffffff"
            }
        },

        plotOptions: {

            pie: {

                donut: {

                    size: "70%",

                    labels: {

                        show: true,

                        total: {

                            show: true,

                            label: "Patrimoine",

                            color: "#ffffff",

                            formatter: function () {

                                return (
                                    Math.round(total)
                                        .toLocaleString("fr-FR")
                                    + " €"
                                );

                            }
                        }
                    }
                }
            }
        },

        dataLabels: {

            enabled: true,

            formatter: function (
                value
            ) {

                return (
                    value.toFixed(1)
                    + "%"
                );

            }
        },

        tooltip: {

            theme: "dark",

            y: {

                formatter: function (
                    value
                ) {

                    return (
                        Math.round(value)
                            .toLocaleString("fr-FR")
                        + " €"
                    );

                }
            }
        },

        responsive: [

            {

                breakpoint: 768,

                options: {

                    chart: {

                        height: 320
                    }
                }
            }
        ],

        theme: {
            mode: "dark"
        }
    };

    allocationChart =
        new ApexCharts(
            chartElement,
            options
        );

    allocationChart.render();
}
