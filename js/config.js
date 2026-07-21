(function () {
  const env = window.__ENV || {}; // optional env injection (Netlify, GH Pages injecteur, etc.)

  // Fallback par défaut : notre déploiement GitHub Pages est un site 100%
  // statique (pas de build Vite/Netlify), donc window.PROXY_BASE_URL et
  // env.* ne sont jamais injectés automatiquement. On garde un défaut en
  // dur pour que le dashboard fonctionne sans configuration manuelle,
  // tout en restant surchargeable (window.PROXY_BASE_URL, localStorage
  // via le panneau ⚙️, ou un futur build avec de vraies env vars).
  const DEFAULT_PROXY_BASE_URL =
    "https://autumn-poetry-ca2cfinance-dashboard-proxy.soudjaymoursala.workers.dev";

  const PROXY_BASE_URL =
    window.PROXY_BASE_URL ||
    env.PROXY_BASE_URL ||
    env.VITE_PROXY_BASE_URL ||
    DEFAULT_PROXY_BASE_URL;

  function getFromLocalStorage(key) {
    try {
      const v = localStorage.getItem(key);
      return v && v.trim() ? v.trim() : null;
    } catch (e) {
      return null;
    }
  }

  function buildSheetUrl(key, viteKey) {
    // priority: injected env > window global > localStorage VITE_* > localStorage URL_* > proxy
    if (env[viteKey]) {
      return env[viteKey];
    }
    if (env["URL_" + key]) {
      return env["URL_" + key];
    }
    if (window["URL_" + key]) {
      return window["URL_" + key];
    }
    const fromLS = getFromLocalStorage(viteKey) || getFromLocalStorage("URL_" + key);
    if (fromLS) return fromLS;
    if (PROXY_BASE_URL) {
      return PROXY_BASE_URL.replace(/\/$/, "") + "/api/" + key;
    }
    return "";
  }

  const CONFIG = {
    PROXY_BASE_URL,
    SHEETS: {
      BUDGET: buildSheetUrl("BUDGET", "VITE_URL_BUDGET"),
      CTO: buildSheetUrl("CTO", "VITE_URL_CTO"),
      PEA: buildSheetUrl("PEA", "VITE_URL_PEA"),
      EVOLUTION: buildSheetUrl("EVOLUTION", "VITE_URL_EVOLUTION"),
      OBJECTIF: buildSheetUrl("OBJECTIF", "VITE_URL_OBJECTIF"),
      BUDGET_MENSUEL: buildSheetUrl("MENSUEL", "VITE_URL_BUDGET_MENSUEL"),
    },
    CHARTS: {
      PATRIMOINE: {
        title: "Évolution du patrimoine",
        xAxisFormat: "MMM YY",
        yAxisFormat: "€",
      },
      ALLOCATION: {
        title: "Allocation du patrimoine",
        seriesNames: ["Cash", "PEA", "CTO"],
      },
    },
    GOALS: [
      { name: "Appartement", emoji: "🏠", target: 50000 },
      { name: "Voiture", emoji: "🚗", target: 10000 },
      { name: "Vacances", emoji: "✈️", target: 3000 },
      { name: "Fonds d'urgence", emoji: "🛟", target: 24000 },
      { name: "Patrimoine 250k", emoji: "🎯", target: 250000 },
    ],
    FIRE: {
      target: 250000,
      aer: 0.04,
      wer: 0.03,
    },
    utils: {
      formatCurrency(value) {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
          value
        );
      },
      formatPercent(value) {
        return `${(value * 100).toFixed(1)}%`;
      },
      formatDate(date) {
        return new Intl.DateTimeFormat("fr-FR", { year: "numeric", month: "long" }).format(
          new Date(date)
        );
      },
    },
  };

  // Expose global window.CONFIG compatible avec googleSheets.js (flat keys)
  window.CONFIG = {
    PROXY_BASE_URL: CONFIG.PROXY_BASE_URL,
    URL_BUDGET: CONFIG.SHEETS.BUDGET,
    URL_EVOLUTION: CONFIG.SHEETS.EVOLUTION,
    URL_OBJECTIF: CONFIG.SHEETS.OBJECTIF,
    URL_PEA: CONFIG.SHEETS.PEA,
    URL_CTO: CONFIG.SHEETS.CTO,
    URL_BUDGET_MENSUEL: CONFIG.SHEETS.BUDGET_MENSUEL,
    CHARTS: CONFIG.CHARTS,
    GOALS: CONFIG.GOALS,
    FIRE: CONFIG.FIRE,
    utils: CONFIG.utils,
  };

  // URL_BUDGET_MENSUEL est optionnelle (feature pas encore configuree cote
  // Cloudflare) : on l'exclut volontairement de la verification "missing"
  // pour ne pas afficher une alerte tant que ce n'est pas branche.

  // Aide au debug et message utilisateur si config manquante
  const missing = Object.entries(window.CONFIG)
    .filter(([k, v]) => k.startsWith("URL_") && k !== "URL_BUDGET_MENSUEL" && (!v || v === ""))
    .map(([k]) => k);

  if (missing.length) {
    const msg = `Configuration manquante : ${missing.join(", ")}. Tu peux coller des URLs CSV via le panneau de configuration (icône ⚙️) ou définir PROXY_BASE_URL.`;
    console.warn(msg);
    try {
      const alerts = document.getElementById("alerts");
      if (alerts) {
        const el = document.createElement("div");
        el.className = "alert alert-error";
        el.textContent = msg;
        alerts.appendChild(el);
      }
    } catch (e) {
      // noop
    }
  } else {
  }
})();
