/* ================================================== */
/* PULL-TO-REFRESH (mobile / tactile)                 */
/* Geste "tirer vers le bas depuis le haut de la page  */
/* pour rafraichir", absent par defaut d'une PWA        */
/* installee sur l'ecran d'accueil iOS (contrairement    */
/* a un onglet Safari classique qui a son propre effet    */
/* de rebond). Reutilise chargerDashboard(), la meme       */
/* fonction que le bouton 🔄 du header.                      */
/*                                                            */
/* Ne se declenche que si on tire depuis tout en haut de la   */
/* page (scrollY === 0) - ne doit jamais interferer avec un    */
/* scroll normal au milieu du contenu.                          */
/* ================================================== */
(function () {
    const PULL_THRESHOLD = 70; // px a tirer pour declencher le refresh
    const MAX_PULL = 90; // tirage visuel maximum (effet elastique au-dela)
    const RESISTANCE = 0.5; // le doigt doit parcourir 2x la distance visuelle (sensation elastique)

    let indicator = null;
    let startY = 0;
    let pulling = false;
    let refreshing = false;

    function lockScreenVisible() {
        const lockScreen = document.getElementById("lockScreen");
        return lockScreen && lockScreen.style.display !== "none";
    }

    function resetIndicator() {
        if (!indicator) return;
        indicator.style.transform = "translateY(-100%)";
        indicator.classList.remove("ptr-visible", "ptr-ready");
    }

    async function declencherRefresh() {
        refreshing = true;
        indicator.classList.add("ptr-spinning");
        indicator.style.transform = "translateY(16px)";
        try {
            if (typeof chargerDashboard === "function") {
                await chargerDashboard();
            }
        } catch (e) {
            console.warn("Pull-to-refresh: echec du rechargement", e);
        } finally {
            setTimeout(function () {
                indicator.classList.remove("ptr-spinning");
                resetIndicator();
                refreshing = false;
            }, 350);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        indicator = document.getElementById("pullToRefreshIndicator");
        if (!indicator || !("ontouchstart" in window)) return; // pas d'ecran tactile, rien a faire

        document.addEventListener("touchstart", function (e) {
            if (refreshing || lockScreenVisible()) return;
            if (window.scrollY > 0) return;
            startY = e.touches[0].clientY;
            pulling = true;
        }, { passive: true });

        document.addEventListener("touchmove", function (e) {
            if (!pulling || refreshing) return;
            const delta = e.touches[0].clientY - startY;

            if (delta <= 0 || window.scrollY > 0) {
                pulling = false;
                resetIndicator();
                return;
            }

            // Empeche le rebond natif du navigateur tant qu'on tire
            // depuis le tout haut de la page, pour laisser place a
            // notre propre effet elastique.
            e.preventDefault();

            const pullDist = Math.min(delta * RESISTANCE, MAX_PULL);
            indicator.style.transform = `translateY(${pullDist - 40}px)`;
            indicator.classList.add("ptr-visible");
            indicator.classList.toggle("ptr-ready", pullDist >= PULL_THRESHOLD);
        }, { passive: false });

        document.addEventListener("touchend", function () {
            if (!pulling || refreshing) { pulling = false; return; }
            pulling = false;
            if (indicator.classList.contains("ptr-ready")) {
                declencherRefresh();
            } else {
                resetIndicator();
            }
        });

        document.addEventListener("touchcancel", function () {
            pulling = false;
            if (!refreshing) resetIndicator();
        });
    });
})();
