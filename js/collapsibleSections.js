/* Sections repliables : clic (ou Entrée/Espace au clavier) sur une carte
   principale -> affiche/masque les sous-cartes de detail associees.
   Plusieurs sections peuvent rester ouvertes simultanement (pas de
   comportement accordeon exclusif). Accessible clavier + lecteurs
   d'ecran (role="button", aria-expanded synchronise). */
(function () {
    function toggle(triggerEl, targetEl, chevronEl, onOpen) {
        const isOpen = targetEl.classList.toggle("open");
        if (chevronEl) chevronEl.classList.toggle("open", isOpen);
        triggerEl.setAttribute("aria-expanded", isOpen ? "true" : "false");

        if (isOpen && typeof onOpen === "function") {
            // Laisser le temps au navigateur d'appliquer le nouvel
            // affichage avant de forcer un recalcul de dimensions
            // (utile pour les graphiques ApexCharts qui auraient ete
            // rendus pendant que leur conteneur etait masque).
            requestAnimationFrame(function () {
                setTimeout(onOpen, 50);
            });
        }
    }

    function bindToggle(triggerEl, targetEl, chevronEl, onOpen) {
        if (!triggerEl || !targetEl) return;

        triggerEl.addEventListener("click", function () {
            toggle(triggerEl, targetEl, chevronEl, onOpen);
        });

        // Accessibilite clavier : role="button" sur un div/h3 ne declenche
        // pas nativement d'action au clavier, contrairement a un vrai
        // <button> - on l'ajoute manuellement (Entree et Espace).
        triggerEl.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle(triggerEl, targetEl, chevronEl, onOpen);
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
