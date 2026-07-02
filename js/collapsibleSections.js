/* Sections repliables : clic (ou Entrée/Espace au clavier) sur une carte
   principale -> affiche/masque les sous-cartes de détail associées.
   Plusieurs sections peuvent rester ouvertes simultanément (pas de
   comportement accordéon exclusif). Accessible clavier + lecteurs
   d'écran (role="button", aria-expanded synchronisé). L'ouverture ET
   la fermeture sont animées symétriquement (pas de disparition brutale
   en display:none instantané). */
(function () {
    function toggle(triggerEl, targetEl, chevronEl, onOpen) {
        const isCurrentlyOpen = targetEl.classList.contains("open");

        if (!isCurrentlyOpen) {
            // OUVERTURE
            targetEl.classList.remove("closing");
            targetEl.classList.add("open");
            if (chevronEl) chevronEl.classList.add("open");
            triggerEl.setAttribute("aria-expanded", "true");

            if (typeof onOpen === "function") {
                // Laisser le temps au navigateur d'appliquer le nouvel
                // affichage avant de forcer un recalcul de dimensions
                // (utile pour les graphiques ApexCharts qui auraient ete
                // rendus pendant que leur conteneur etait masque).
                requestAnimationFrame(function () {
                    setTimeout(onOpen, 50);
                });
            }
        } else {
            // FERMETURE : on joue une animation de sortie avant de
            // repasser reellement a display:none (sinon le contenu
            // disparaissait instantanement, contrairement a l'ouverture).
            targetEl.classList.remove("open");
            targetEl.classList.add("closing");
            if (chevronEl) chevronEl.classList.remove("open");
            triggerEl.setAttribute("aria-expanded", "false");

            const handleAnimationEnd = function () {
                targetEl.classList.remove("closing");
                targetEl.removeEventListener("animationend", handleAnimationEnd);
            };
            targetEl.addEventListener("animationend", handleAnimationEnd);
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
        document.getElementById("cashAccountCard"),
        document.getElementById("cashDetailSection"),
        document.getElementById("cashChevron")
    );

    bindToggle(
        document.getElementById("peaAccountCard"),
        document.getElementById("peaDetailSection"),
        document.getElementById("peaChevron"),
        function () {
            window.dispatchEvent(new Event("resize"));
        }
    );

    bindToggle(
        document.getElementById("ctoAccountCard"),
        document.getElementById("ctoDetailSection"),
        document.getElementById("ctoChevron"),
        function () {
            window.dispatchEvent(new Event("resize"));
        }
    );
})();
