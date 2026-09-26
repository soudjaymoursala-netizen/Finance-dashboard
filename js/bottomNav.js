/* ================================================== */
/* BARRE DE NAVIGATION EN BAS (mobile)                */
/* Ancrage vers les 4 grandes zones de la page plutot */
/* que de forcer un long scroll manuel a chaque fois -  */
/* pattern app native. Masquee sur desktop (voir CSS,    */
/* le scroll classique y suffit).                         */
/*                                                          */
/* Reste cachee tant que le dashboard est verrouille        */
/* (voir lock.js, classe .visible ajoutee/retiree avec       */
/* unlock()/lock()).                                          */
/* ================================================== */
(function () {
    const nav = document.getElementById("bottomNav");
    if (!nav) return;

    const items = Array.from(nav.querySelectorAll(".bottom-nav-item"));
    if (!items.length) return;

    items.forEach((item) => {
        item.addEventListener("click", () => {
            // Certains items ciblent une section a onglets (ex: Budget) -
            // data-tab indique lequel activer avant de faire defiler,
            // sinon on atterrirait potentiellement sur un panneau cache.
            const tab = item.getAttribute("data-tab");
            if (tab && typeof window.activerOngletBudget === "function") window.activerOngletBudget(tab);

            const targetId = item.getAttribute("data-target");
            const target = document.getElementById(targetId);
            if (!target) return;
            const y = target.getBoundingClientRect().top + window.scrollY - 12;
            window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        });
    });

    function setActive(id) {
        items.forEach((item) => {
            item.classList.toggle("active", item.getAttribute("data-target") === id);
        });
    }

    const sectionIds = items.map((i) => i.getAttribute("data-target"));
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

    if ("IntersectionObserver" in window && sections.length) {
        // Bande d'observation centree sur le milieu de l'ecran plutot que
        // toute la hauteur : evite qu'une section tres longue (ex: Comptes)
        // reste "active" du debut a la fin de son defilement pendant
        // qu'on lit deja la section suivante.
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActive(entry.target.id);
                });
            },
            { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
        );
        sections.forEach((s) => observer.observe(s));
    }

    setActive(sectionIds[0]);
})();
