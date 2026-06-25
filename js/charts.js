let patrimoineChart = null;

function updatePatrimoineChart(labels, valeurs) {

    if (patrimoineChart) {
        patrimoineChart.destroy();
    }

    const options = {

        chart: {
            type: 'area',
            height: 350,
            toolbar: {
                show: false
            }
        },

        series: [{
            name: 'Patrimoine',
            data: valeurs
        }],

        xaxis: {
            categories: labels
        },

        stroke: {
            curve: 'smooth',
            width: 3
        },

        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.05
            }
        },

        colors: ['#22c55e'],

        theme: {
            mode: 'dark'
        },

        yaxis: {
            labels: {
                formatter: function(value) {
                    return Math.round(value).toLocaleString("fr-FR") + " €";
                }
            }
        },

        tooltip: {
            y: {
                formatter: function(value) {
                    return Math.round(value).toLocaleString("fr-FR") + " €";
                }
            }
        }
    };

    patrimoineChart = new ApexCharts(
        document.querySelector("#patrimoineChart"),
        options
    );

    patrimoineChart.render();
}
