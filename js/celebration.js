/* ================================================== */
/* CELEBRATIONS — petits moments de satisfaction      */
/* Confettis + message quand un palier significatif    */
/* est franchi : patrimoine (tous les 10 000€) ou       */
/* avancement FIRE (25/50/75/100%). Se declenche une      */
/* seule fois par palier (memorise en localStorage), pas   */
/* a chaque rechargement - et jamais lors de la toute        */
/* premiere visite (rien a "franchir" par rapport a une       */
/* reference qui n'existe pas encore).                          */
/* ================================================== */

const MILESTONE_PATRIMOINE_KEY = "financeDashboard_dernierPalierPatrimoine";
const MILESTONE_FIRE_KEY = "financeDashboard_dernierPalierFire";
const PALIERS_FIRE = [25, 50, 75, 100];

function verifierPaliers(patrimoine, progressionFire) {
    try {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        // --- Palier patrimoine (tous les 10 000 €) ---
        const premierePatrimoine = localStorage.getItem(MILESTONE_PATRIMOINE_KEY) === null;
        const palierActuel = Math.floor((patrimoine || 0) / 10000) * 10000;
        const dernierPalier = parseInt(localStorage.getItem(MILESTONE_PATRIMOINE_KEY) || "0", 10);
        if (palierActuel > dernierPalier) {
            localStorage.setItem(MILESTONE_PATRIMOINE_KEY, String(palierActuel));
            if (!premierePatrimoine) {
                celebrer(`🎉 Cap des ${Math.round(palierActuel / 1000)} 000 € franchi !`);
            }
        }

        // --- Palier FIRE (25 / 50 / 75 / 100%) ---
        const premiereFire = localStorage.getItem(MILESTONE_FIRE_KEY) === null;
        const dernierPalierFire = parseInt(localStorage.getItem(MILESTONE_FIRE_KEY) || "0", 10);
        let nouveauPalierFire = dernierPalierFire;
        PALIERS_FIRE.forEach((p) => {
            if ((progressionFire || 0) >= p && p > nouveauPalierFire) nouveauPalierFire = p;
        });
        if (nouveauPalierFire > dernierPalierFire) {
            localStorage.setItem(MILESTONE_FIRE_KEY, String(nouveauPalierFire));
            if (!premiereFire) {
                celebrer(
                    nouveauPalierFire === 100
                        ? "🏆 Objectif d'indépendance financière atteint !"
                        : `🔥 ${nouveauPalierFire}% du chemin vers l'indépendance financière !`
                );
            }
        }
    } catch (e) {
        console.warn("Verification des paliers impossible:", e);
    }
}

function celebrer(message) {
    lancerConfettis();
    afficherToastCelebration(message);
}

function lancerConfettis() {
    const couleurs = ["#2DD4A7", "#4EC5CF", "#D9A441", "#F0576B", "#6C5CE0"];
    const conteneur = document.createElement("div");
    conteneur.className = "confetti-container";
    document.body.appendChild(conteneur);

    for (let i = 0; i < 60; i++) {
        const piece = document.createElement("span");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.backgroundColor = couleurs[Math.floor(Math.random() * couleurs.length)];
        piece.style.animationDelay = (Math.random() * 0.4) + "s";
        piece.style.animationDuration = (2 + Math.random() * 1.2) + "s";
        piece.style.setProperty("--drift", (Math.random() * 100 - 50) + "px");
        piece.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
        conteneur.appendChild(piece);
    }

    setTimeout(() => conteneur.remove(), 3600);
}

function afficherToastCelebration(message) {
    const toast = document.createElement("div");
    toast.className = "celebration-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 400);
    }, 3800);
}
