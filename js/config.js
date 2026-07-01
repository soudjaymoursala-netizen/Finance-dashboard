const CONFIG = {
  // Adresse du Worker Cloudflare qui proxifie les Google Sheets.
  // Pas une donnée sensible : elle est publique par nature (le site
  // GitHub Pages l'est aussi), protégée seulement par la vérification
  // d'origine (ALLOWED_ORIGIN) côté Worker.
  // -> Remplacez par votre URL après déploiement (voir cloudflare-worker/worker.js)
  PROXY_BASE_URL: "https://finance-dashboard-proxy.VOTRE-SOUS-DOMAINE.workers.dev",

  SHEETS: {
    get BUDGET() { return CONFIG.PROXY_BASE_URL + "/api/BUDGET"; },
    get EVOLUTION() { return CONFIG.PROXY_BASE_URL + "/api/EVOLUTION"; },
    get OBJECTIF() { return CONFIG.PROXY_BASE_URL + "/api/OBJECTIF"; },
    get PEA() { return CONFIG.PROXY_BASE_URL + "/api/PEA"; },
    get CTO() { return CONFIG.PROXY_BASE_URL + "/api/CTO"; }
  },

  // Paramètres des graphiques
  CHARTS: {
    PATRIMOINE: {
      title: "Évolution du patrimoine",
      xAxisFormat: "MMM YY",
      yAxisFormat: "€"
    },
    ALLOCATION: {
      title: "Allocation du patrimoine",
      seriesNames: ["Cash", "PEA", "CTO"]
    }
  },

  // Objectifs financiers
  GOALS: [
    { name: "Appartement", emoji: "🏠", target: 50000 },
    { name: "Voiture", emoji: "🚗", target: 10000 },
    { name: "Vacances", emoji: "✈️", target: 3000 },
    { name: "Fonds d'urgence", emoji: "🛟", target: 24000 },
    { name: "Patrimoine 250k", emoji: "🎯", target: 250000 }
  ],

  // Paramètres du FIRE Tracker
  FIRE: {
    target: 250000,
    aer: 0.04,
    wer: 0.03
  },

  // Fonctions utilitaires
  utils: {
    formatCurrency(value) {
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
    },

    formatPercent(value) {
      return `${(value * 100).toFixed(1)}%`;
    },

    formatDate(date) {
      return new Intl.DateTimeFormat("fr-FR", { year: "numeric", month: "long" }).format(new Date(date));
    }
  }
};

// Expose a global window.CONFIG compatible with googleSheets.js
// googleSheets.js expects flat keys like window.CONFIG.URL_BUDGET, etc.
window.CONFIG = {
  URL_BUDGET: CONFIG.SHEETS.BUDGET,
  URL_EVOLUTION: CONFIG.SHEETS.EVOLUTION,
  URL_OBJECTIF: CONFIG.SHEETS.OBJECTIF,
  URL_PEA: CONFIG.SHEETS.PEA,
  URL_CTO: CONFIG.SHEETS.CTO,

  // also provide convenience access to other config parts if needed
  CHARTS: CONFIG.CHARTS,
  GOALS: CONFIG.GOALS,
  FIRE: CONFIG.FIRE,
  utils: CONFIG.utils
};
