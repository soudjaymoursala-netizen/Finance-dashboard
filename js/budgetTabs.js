/* ================================================== */
/* ONGLETS DU MODULE BUDGET                            */
/* Fusionne Suivi mensuel / Budget annuel / Objectifs  */
/* d'epargne (3 sections separees auparavant) en un    */
/* seul module a onglets - voir index.html #navBudget. */
/* ================================================== */
(function () {
    const tabBar = document.getElementById("budgetTabs");
    if (!tabBar) return;

    const buttons = Array.from(tabBar.querySelectorAll("[data-tab]"));
    const panels = Array.from(document.querySelectorAll(".budget-tab-panel"));

    function activate(tabName) {
        buttons.forEach((btn) => {
            const isActive = btn.getAttribute("data-tab") === tabName;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        panels.forEach((panel) => {
            panel.classList.toggle("active", panel.getAttribute("data-panel") === tabName);
        });
        try { localStorage.setItem("budgetActiveTab", tabName); } catch (e) { /* stockage indisponible, pas bloquant */ }
        // Un graphique ApexCharts rendu pendant que son panneau etait
        // display:none calcule une largeur de 0 - un resize une fois le
        // panneau visible suffit a corriger la mise en page.
        window.dispatchEvent(new Event("resize"));
    }

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => activate(btn.getAttribute("data-tab")));
    });

    // Permet a la bottom-nav (ou tout autre appelant) de choisir
    // directement un onglet avant de faire defiler jusqu'a la section.
    window.activerOngletBudget = activate;

    let initial = "annuel";
    try {
        const saved = localStorage.getItem("budgetActiveTab");
        const btn = saved && buttons.find((b) => b.getAttribute("data-tab") === saved);
        // Le bouton "Mensuel" reste display:none tant que chargerSuiviAnnuel()
        // n'a pas trouve de donnees - ignorer un choix sauvegarde pointant
        // dessus tant qu'il est indisponible.
        if (btn && btn.style.display !== "none") initial = saved;
    } catch (e) { /* stockage indisponible, pas bloquant */ }

    activate(initial);
})();
