/* Sections repliables : clic sur une carte principale -> affiche/masque
   les sous-cartes de detail associees. Plusieurs sections peuvent
   rester ouvertes simultanement (pas de comportement accordeon exclusif). */
(function () {
    function bindToggle(triggerEl, targetEl, chevronEl, onOpen) {
        if (!triggerEl || !targetEl) return;

        triggerEl.addEventListener("click", function () {
            const isOpen = targetEl.classList.toggle("open");
            if (chevronEl) chevronEl.classList.toggle("open", isOpen);

            if (isOpen && typeof onOpen === "function") {
                // Laisser le temps au navigateur d'appliquer le nouvel
                // affichage avant de forcer un recalcul de dimensions
                // (utile pour les graphiques ApexCharts qui auraient ete
                // rendus pendant que leur conteneur etait masque).
                requestAnimationFrame(function () {
                    setTimeout(onOpen, 50);
                });
            }
        });
    }

    bindToggle(
        document.getElementById("heroCard"),
        document.getElementById("heroChipRow"),
        document.getElementById("heroChevron")
    );

    bindToggle(
        document.getElementById("kpiAvancesToggle"),
        document.getElementById("kpiAvancesChipRow"),
        document.getElementById("kpiAvancesChevron")
    );

    bindToggle(
        document.getElementById("allocationToggle"),
        document.getElementById("compositionSection"),
        document.getElementById("allocationChevron"),
        function () {
            window.dispatchEvent(new Event("resize"));
        }
    );
})();
