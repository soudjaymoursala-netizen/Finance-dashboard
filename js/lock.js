// Écran de verrouillage simple (empêche la lecture accidentelle si le
// téléphone est prêté). Ce n'est PAS une sécurité forte : le code est
// visible dans ce fichier. Objectif = éviter un accès par erreur, pas
// se protéger d'un attaquant motivé.
(function () {
    const CODE = "Dashboard"; // <-- change ce mot ici pour changer le code
    const SESSION_KEY = "financeDashboard_unlocked";

    const lockScreen = document.getElementById("lockScreen");
    const container = document.getElementById("mainContainer");
    const input = document.getElementById("lockInput");
    const submitBtn = document.getElementById("lockSubmit");
    const errorEl = document.getElementById("lockError");
    const toggleBtn = document.getElementById("lockToggleVisibility");

    function unlock() {
        if (lockScreen) lockScreen.style.display = "none";
        if (container) container.classList.remove("blurred");
        sessionStorage.setItem(SESSION_KEY, "1");
    }

    function lock() {
        if (lockScreen) lockScreen.style.display = "flex";
        if (container) container.classList.add("blurred");
        if (errorEl) errorEl.style.display = "none";
        if (input) input.value = "";
        sessionStorage.removeItem(SESSION_KEY);
    }

    function tryUnlock() {
        if (input && input.value === CODE) {
            unlock();
        } else if (errorEl) {
            errorEl.style.display = "";
            if (input) {
                input.value = "";
                input.focus();
            }
        }
    }

    // Déjà déverrouillé dans cette session de navigateur (jusqu'à fermeture)
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
        unlock();
    }

    if (submitBtn) submitBtn.addEventListener("click", tryUnlock);
    if (input) {
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") tryUnlock();
        });
    }
    if (toggleBtn && input) {
        toggleBtn.addEventListener("click", function () {
            const isHidden = input.type === "password";
            input.type = isHidden ? "text" : "password";
            toggleBtn.textContent = isHidden ? "🙈" : "👁️";
            toggleBtn.setAttribute("aria-label", isHidden ? "Masquer le code" : "Afficher le code");
            input.focus();
        });
    }

    // Re-verrouillage automatique dès que la page quitte le premier plan
    // (changement d'appli, verrouillage de l'écran, mise en arrière-plan
    // de l'onglet). Comportement type "appli bancaire" : on redemande le
    // code à chaque retour, même si l'onglet n'a jamais été fermé.
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) lock();
    });
    window.addEventListener("pagehide", lock);
    window.addEventListener("blur", lock);
})();
