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

    function unlock() {
        if (lockScreen) lockScreen.style.display = "none";
        if (container) container.classList.remove("blurred");
        sessionStorage.setItem(SESSION_KEY, "1");
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
})();
