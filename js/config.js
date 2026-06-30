const CONFIG = {
  // URLs des Google Sheets
  SHEETS: {
    BUDGET: "https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID_BUDGET/export?format=csv&gid=519498006",
    EVOLUTION: "https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID_BUDGET/export?format=csv&gid=810332816",
    OBJECTIF: "https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID_BUDGET/export?format=csv&gid=1700667008",
    PEA: "https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID_PEA/export?format=csv&gid=1971681206",
    CTO: "https://docs.google.com/spreadsheets/d/REDACTED_SHEET_ID_CTO/export?format=csv&gid=1361663202"
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
