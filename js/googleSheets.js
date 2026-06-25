const URL_BUDGET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9KHpZTDI_ScwMcwclQIBBNIaegUQopTKc385hG86xC6bpnamp-JGWUDALv_f9rg/pub?gid=519498006&single=true&output=csv";

async function test() {

    try {

        const response = await fetch(URL_BUDGET);

        alert("Status : " + response.status);

        const text = await response.text();

        alert(text.substring(0, 200));

    }

    catch(error) {

        alert("ERREUR : " + error);

    }

}

test();
