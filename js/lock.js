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
    const faceIdBtn = document.getElementById("lockFaceId");
    const faceIdOffer = document.getElementById("faceIdOffer");
    const faceIdOfferAccept = document.getElementById("faceIdOfferAccept");
    const faceIdOfferDecline = document.getElementById("faceIdOfferDecline");

    // --- Face ID / Touch ID (WebAuthn) ---------------------------------
    // Couche de confort LOCALE, distincte de la verification du code par
    // le Worker : WebAuthn genere une paire de cles sur l'appareil (via
    // l'enclave securisee derriere Face ID/Touch ID/Windows Hello), la
    // cle privee ne quitte JAMAIS l'appareil et n'est jamais envoyee a
    // mon Worker Cloudflare. On ne verifie pas la signature cote serveur
    // (pas de backend WebAuthn complet ici, ce serait disproportionne
    // pour un dashboard perso) : succes de navigator.credentials.get()
    // avec userVerification "required" = preuve suffisante de presence
    // biometrique pour ce niveau de menace. Le code reste le filet de
    // secours (autre appareil/navigateur, ou Face ID indisponible).
    const FACEID_CRED_KEY = "financeDashboard_faceIdCredId";
    const FACEID_OFFER_DISMISSED_KEY = "financeDashboard_faceIdOfferDismissed";

    function webAuthnSupported() {
        return !!(window.PublicKeyCredential && navigator.credentials);
    }

    async function platformAuthAvailable() {
        if (!webAuthnSupported()) return false;
        try {
            return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (e) {
            return false;
        }
    }

    async function registerFaceId() {
        try {
            const cred = await navigator.credentials.create({
                publicKey: {
                    challenge: crypto.getRandomValues(new Uint8Array(32)),
                    rp: { name: "Finance Dashboard" },
                    user: {
                        id: crypto.getRandomValues(new Uint8Array(16)),
                        name: "dashboard",
                        displayName: "Finance Dashboard",
                    },
                    pubKeyCredParams: [
                        { type: "public-key", alg: -7 },   // ES256
                        { type: "public-key", alg: -257 }, // RS256
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required",
                        // Cle residente/decouvrable (passkey) : stockee dans
                        // le trousseau du systeme (Keychain iOS, Credential
                        // Manager Android/Windows), associee au DOMAINE et
                        // non a ce navigateur/contexte precis. C'est ce qui
                        // permet de la retrouver aussi bien depuis Safari
                        // que depuis l'app installee sur l'ecran d'accueil,
                        // qui ont un localStorage totalement separe sur iOS.
                        residentKey: "required",
                        requireResidentKey: true, // alias pour compatibilite navigateurs plus anciens
                    },
                    timeout: 60000,
                    attestation: "none",
                },
            });
            if (!cred) return false;
            // Le localStorage sert desormais seulement d'indice local pour
            // savoir si CE navigateur/contexte a deja propose Face ID une
            // fois (evite de re-proposer la banniere a chaque session) -
            // la veritable source de verite est le trousseau systeme,
            // interroge directement dans unlockWithFaceId() ci-dessous.
            localStorage.setItem(FACEID_CRED_KEY, "1");
            return true;
        } catch (e) {
            console.warn("Enregistrement Face ID annulé ou échoué :", e);
            return false;
        }
    }

    async function unlockWithFaceId() {
        try {
            // Pas de allowCredentials : on laisse l'OS chercher lui-meme
            // une cle decouvrable existante pour ce domaine dans son
            // trousseau, qu'elle ait ete enregistree depuis Safari ou
            // depuis l'app installee - les deux partagent le meme trousseau
            // systeme meme si leur localStorage est separe.
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: crypto.getRandomValues(new Uint8Array(32)),
                    userVerification: "required",
                    timeout: 60000,
                },
            });
            if (assertion) {
                unlock();
                localStorage.setItem(FACEID_CRED_KEY, "1"); // met a jour l'indice local au passage
            }
        } catch (e) {
            // Annulé, aucune cle trouvée pour ce domaine, ou échec
            // biométrique : on reste simplement sur l'écran de code.
            console.warn("Face ID annulé ou échoué :", e);
        }
    }

    function updateFaceIdUI(available) {
        if (faceIdBtn) faceIdBtn.style.display = available ? "" : "none";
    }

    async function maybeOfferFaceId() {
        if (!faceIdOffer) return;
        if (localStorage.getItem(FACEID_CRED_KEY)) return; // deja propose/configure dans ce contexte
        if (localStorage.getItem(FACEID_OFFER_DISMISSED_KEY)) return; // deja refusee une fois
        const available = await platformAuthAvailable();
        if (available) faceIdOffer.style.display = "";
    }
    // --------------------------------------------------------------------

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
                maybeOfferFaceId();
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

    if (faceIdBtn) {
        faceIdBtn.addEventListener("click", unlockWithFaceId);
    }

    if (faceIdOfferAccept) {
        faceIdOfferAccept.addEventListener("click", async function () {
            const ok = await registerFaceId();
            if (faceIdOffer) faceIdOffer.style.display = "none";
            if (ok) platformAuthAvailable().then(updateFaceIdUI);
        });
    }

    if (faceIdOfferDecline) {
        faceIdOfferDecline.addEventListener("click", function () {
            localStorage.setItem(FACEID_OFFER_DISMISSED_KEY, "1");
            if (faceIdOffer) faceIdOffer.style.display = "none";
        });
    }

    // Initialise la visibilite du bouton Face ID des le chargement (si
    // deja configure sur cet appareil/navigateur, propose le fast-path
    // tout de suite plutot que d'attendre un premier deverrouillage par code)
    platformAuthAvailable().then(updateFaceIdUI);

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
