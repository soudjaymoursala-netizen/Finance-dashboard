/* Effet ripple : onde tactile au clic/tap sur les cartes du dashboard.
   Delegation d'evenement sur document -> fonctionne aussi pour les
   cartes generees dynamiquement (objectifs annuels). */
(function () {
    const SELECTOR = ".card, .chip, .goal-card, .objectif-annuel-card";

    function createRipple(event) {
        const target = event.target.closest(SELECTOR);
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = (event.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
        const y = (event.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;

        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = x + "px";
        ripple.style.top = y + "px";

        target.appendChild(ripple);
        ripple.addEventListener("animationend", () => ripple.remove());
    }

    document.addEventListener("click", createRipple);
})();
