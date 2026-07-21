// Écran de verrouillage simple (empêche la lecture accidentelle si le
// téléphone est prêté). Ce n'est PAS une sécurité forte : quiconque
// contrôle le Worker Cloudflare ou intercepte le réseau pourrait
// contourner ça. Objectif = éviter un accès par erreur, pas se protéger
// d'un attaquant motivé.
//
// Le code n'est PLUS stocké en clair ici (contrairement à l'ancienne
// version) : il est vérifié côté serveur par le Worker Cloudflare, via
// le secret LOCK_CODE (voir cloudflare-worker/README.md). Ce fichier se
// contente d'envoyer la saisie au Worker et d'attendre ok:true/false.
(function () {
    const SESSION_KEY = "financeDashboard_unlocked";

    const lockScreen = document.getElementById("lockScreen");
    const container = document.getElementById("mainContainer");
    const input = document.getElementById("lockInput");
    const submitBtn = document.getElementById("lockSubmit");
    const errorEl = document.getElementById("lockError");
    const toggleBtn = document.getElementById("lockToggleVisibility");

    function getProxyBaseUrl() {
        // config.js est chargé avant lock.js (voir index.html) et expose
        // window.CONFIG.PROXY_BASE_URL. Fallback vide si absent : on
        // affichera alors une erreur claire plutôt qu'un échec silencieux.
        return (window.CONFIG && window.CONFIG.PROXY_BASE_URL) || "";
    }

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

    let busy = false;

    function setBusy(b) {
        busy = b;
        if (submitBtn) {
            submitBtn.disabled = b;
            submitBtn.textContent = b ? "Vérification…" : "Déverrouiller";
        }
    }

    function showError(message) {
        if (!errorEl) return;
        errorEl.textContent = message || "Code incorrect";
        errorEl.style.display = "";
        if (input) {
            input.value = "";
            input.focus();
        }
    }

    async function tryUnlock() {
        if (busy) return; // deja une verification en cours (evite le double-appel Entree+clic)
        const code = input ? input.value : "";
        if (!code) return;

        const base = getProxyBaseUrl();
        if (!base) {
            showError("Configuration manquante : impossible de vérifier le code.");
            return;
        }

        setBusy(true);
        try {
            const res = await fetch(base.replace(/\/$/, "") + "/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = await res.json().catch(() => ({ ok: false }));
            if (data && data.ok) {
                unlock();
            } else {
                showError("Code incorrect");
            }
        } catch (e) {
            showError("Erreur réseau, réessayez.");
        } finally {
            setBusy(false);
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

    // Re-verrouillage automatique quand l'onglet passe reellement en
    // arriere-plan (changement d'appli, minimisation, autre onglet) ou
    // a la fermeture/navigation. On n'ecoute PAS "blur" : cet evenement
    // se declenche sur n'importe quelle perte de focus de la fenetre
    // (outil de capture d'ecran, DevTools sur un second ecran, clic sur
    // une autre fenetre) meme quand la page reste parfaitement visible,
    // ce qui reverrouillait de facon intempestive.
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) lock();
    });
    window.addEventListener("pagehide", lock);
})();
