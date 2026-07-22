/* Service worker PWA - Finance Dashboard
 *
 * Role UNIQUE : mettre en cache le "shell" statique de l'appli (HTML,
 * CSS, JS, icones) pour que l'appli s'ouvre instantanement, meme sans
 * reseau. Les VRAIES donnees financieres (appels vers le Worker
 * Cloudflare autumn-poetry-...workers.dev) ne sont jamais interceptees
 * ici - ce fichier ne fait rien de special pour elles, elles suivent
 * le chemin reseau normal, et js/dataCache.js gere deja leur fallback
 * hors-ligne cote application (localStorage). Deux systemes de cache
 * differents pour deux besoins differents : le shell change rarement
 * et doit etre instantane, les donnees financieres doivent toujours
 * essayer d'etre fraiches en premier.
 *
 * CACHE_VERSION : a incrementer manuellement a chaque fois qu'un
 * fichier de la liste PRECACHE_URLS change de contenu, pour forcer
 * la mise a jour du cache chez les utilisateurs deja installes.
 */

const CACHE_VERSION = "shell-v2"; // v2 : passage a la strategie network-first (voir fetch handler)

const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./css/style.css",
    "./css/alerts.css",
    "./js/config.js",
    "./js/lock.js",
    "./js/charts.js",
    "./js/errorHandler.js",
    "./js/parsing.js",
    "./js/dataCache.js",
    "./js/mouvements.js",
    "./js/suiviAnnuel.js",
    "./js/googleSheets.js",
    "./js/runtimeConfigUI.js",
    "./js/rippleEffect.js",
    "./js/collapsibleSections.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            // cache: 'reload' force une vraie requete reseau (pas le cache
            // HTTP du navigateur) pour etre sur d'avoir le contenu le plus
            // recent au moment de l'installation du service worker.
            const requests = PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }));
            return Promise.all(
                requests.map((req) =>
                    fetch(req)
                        .then((res) => cache.put(req, res))
                        .catch(() => {
                            // Un fichier manquant ne doit pas empecher l'installation
                            // du reste du shell (ex: icone pas encore presente).
                        })
                )
            );
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_VERSION)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const req = event.request;

    // On ne s'occupe que des requetes GET, meme origine (le shell).
    // Tout le reste (appels au Worker Cloudflare sur un autre domaine,
    // requetes POST /api/auth, etc.) n'est pas intercepte du tout : on
    // laisse le navigateur gerer normalement, sans appeler respondWith.
    if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
        return;
    }

    // Network-first : on tente TOUJOURS le reseau en premier, pour voir
    // les derniers changements des le premier rechargement (utile en
    // developpement actif). Le cache ne sert que si le reseau echoue
    // vraiment (vraiment hors-ligne), pas juste pour aller plus vite.
    event.respondWith(
        fetch(req)
            .then((res) => {
                if (res && res.ok) {
                    caches.open(CACHE_VERSION).then((cache) => cache.put(req, res.clone()));
                }
                return res;
            })
            .catch(() => caches.match(req, { ignoreSearch: true }))
    );
});
