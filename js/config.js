const CONFIG = {
  // URLs des Google Sheets — chargées depuis config.local.js (non versionné)
  // Voir config.local.example.js pour le modèle à copier.
  SHEETS: (window.LOCAL_CONFIG && window.LOCAL_CONFIG.SHEETS) || {
    BUDGET: "",
    EVOLUTION: "",
    OBJECTIF: "",
    PEA: "",
    CTO: ""
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
