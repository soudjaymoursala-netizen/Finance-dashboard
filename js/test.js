fetch(CONFIG.URL_BUDGET)
    .then(r => r.text())
    .then(data => {

        console.log(data);

    });
