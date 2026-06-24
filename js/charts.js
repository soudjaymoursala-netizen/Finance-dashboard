const options = {
    chart: {
        type: 'donut',
        height: 350
    },

    series: [45, 30, 15, 10],

    labels: [
        'ETF',
        'Actions',
        'Crypto',
        'Cash'
    ],

    theme: {
        mode: 'dark'
    },

    legend: {
        position: 'bottom'
    }
};

const chart = new ApexCharts(
    document.querySelector("#portfolioChart"),
    options
);

chart.render();
