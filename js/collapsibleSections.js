/* Sections repliables : clic (ou Entrée/Espace au clavier) sur une carte
   principale -> affiche/masque les sous-cartes de détail associées.
   Comportement par defaut : plusieurs sections peuvent rester ouvertes
   simultanement. Comportement 'accordeon exclusif' active par groupId
   (ex: les 3 cartes de comptes Cash/PEA/CTO partagent le meme groupe,
   ouvrir l'une ferme automatiquement l'autre - le detail complet de
   chaque compte est trop grand pour se justifier a l'ecran en meme
   temps qu'un autre, evite la confusion visuelle). Accessible clavier
   + lecteurs d'ecran (role="button", aria-expanded synchronise).
   L'ouverture ET la fermeture sont animees symetriquement. */
(function () {
    // Registre des membres de chaque groupe accordeon exclusif
    const groups = {};

    function closeSection(triggerEl, targetEl, chevronEl) {
        if (!targetEl.classList.contains("open")) return;
        targetEl.classList.remove("open");
        targetEl.classList.add("closing");
        if (chevronEl) chevronEl.classList.remove("open");
        if (triggerEl) triggerEl.setAttribute("aria-expanded", "false");

        const handleAnimationEnd = function () {
            targetEl.classList.remove("closing");
            targetEl.removeEventListener("animationend", handleAnimationEnd);
        };
        targetEl.addEventListener("animationend", handleAnimationEnd);
    }

    function toggle(triggerEl, targetEl, chevronEl, onOpen, groupId) {
        const isCurrentlyOpen = targetEl.classList.contains("open");

        if (!isCurrentlyOpen) {
            // Accordeon exclusif : fermer les autres membres du meme groupe
            if (groupId && groups[groupId]) {
                groups[groupId].forEach(function (member) {
                    if (member.targetEl !== targetEl) {
                        closeSection(member.triggerEl, member.targetEl, member.chevronEl);
                    }
                });
            }

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
            closeSection(triggerEl, targetEl, chevronEl);
        }
    }

    function bindToggle(triggerEl, targetEl, chevronEl, onOpen, groupId) {
        if (!triggerEl || !targetEl) return;

        if (groupId) {
            if (!groups[groupId]) groups[groupId] = [];
            groups[groupId].push({ triggerEl, targetEl, chevronEl });
        }

        triggerEl.addEventListener("click", function () {
            toggle(triggerEl, targetEl, chevronEl, onOpen, groupId);
        });

        // Accessibilite clavier : role="button" sur un div/h3 ne declenche
        // pas nativement d'action au clavier, contrairement a un vrai
        // <button> - on l'ajoute manuellement (Entree et Espace).
        triggerEl.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle(triggerEl, targetEl, chevronEl, onOpen, groupId);
            }
        });
    }

    // Expose pour les cartes generees dynamiquement (ex: cartes "Suivi
    // annuel" par annee, construites dans googleSheets.js une fois les
    // donnees chargees - impossible de les cabler ici puisqu'elles
    // n'existent pas encore dans le HTML statique a ce stade).
    window.bindToggleSection = bindToggle;

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

    // Les 3 cartes de comptes forment un groupe accordeon exclusif :
    // ouvrir l'une ferme automatiquement l'autre (voir commentaire en-tete).
    bindToggle(
        document.getElementById("cashAccountCard"),
        document.getElementById("cashDetailSection"),
        document.getElementById("cashChevron"),
        null,
        "comptes"
    );

    bindToggle(
        document.getElementById("peaAccountCard"),
        document.getElementById("peaDetailSection"),
        document.getElementById("peaChevron"),
        function () {
            window.dispatchEvent(new Event("resize"));
        },
        "comptes"
    );

    bindToggle(
        document.getElementById("ctoAccountCard"),
        document.getElementById("ctoDetailSection"),
        document.getElementById("ctoChevron"),
        function () {
            window.dispatchEvent(new Event("resize"));
        },
        "comptes"
    );
})();
