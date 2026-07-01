# Finance Dashboard 💰

Tableau de bord financier personnel pour suivre le patrimoine, les investissements et les objectifs d'épargne.

## Fonctionnalités

- **KPI Principaux** : Patrimoine total, Cash, PEA, CTO, Investissements
- **KPI Avancés** : Plus-value totale, Performance globale, Capital investi, Ratio investi
- **FIRE Tracker** : Progression vers l'objectif 250k avec projection d'atteinte
- **Nouveaux KPI (v5+)** :
  - Taux d'épargne exact
  - Mois de couverture (cash disponible)
  - Exposition investissements (%)
- **Graphiques** : Évolution du patrimoine (avec moyenne mobile 3M), Allocation du patrimoine (donut)
- **Objectifs** : Suivi des objectifs personnels (Appartement, Voiture, Vacances, Fonds d'urgence, Patrimoine 250k)
- **Thème** : Mode sombre/clair avec sauvegarde en localStorage
- **Robustesse** : Retry automatique, cache client, gestion d'erreurs visibles

## Architecture

```
├── index.html                 # Page principale
├── css/
│   └── style.css             # Styles (thème clair/sombre)
├── js/
│   ├── config.js             # Configuration (URLs de données)
│   ├── googleSheets.js       # Logique principale (fetch, calculs, DOM)
│   ├── charts.js             # Graphiques ApexCharts
│   └── errorHandler.js       # Gestion erreurs + alertes
├── cloudflare-worker/
│   └── worker.js             # Proxy Cloudflare Worker (protection des URLs)
└── README.md
```

## Sources de données

Le dashboard récupère les données depuis des Google Sheets protégées via un Cloudflare Worker :

- **API_BUDGET** : KPI financiers (patrimoine, cash, investissements, revenus, dépenses)
- **API_EVOLUTION** : Historique du patrimoine (mensuel depuis décembre 2025)
- **API_PEA** : Détails du compte PEA (valeur, investi, plus-value, allocation)
- **API_CTO** : Détails du compte CTO en CHF (avec conversion EUR)
- **API_OBJECTIF** : Objectifs cibles et progression

## Déploiement

### 1. Prérequis

- Accès à Cloudflare Workers (compte Cloudflare gratuit suffisant)
- GitHub Actions ou déploiement manuel des fichiers statiques
- Google Sheets avec exports CSV publiques

### 2. Déployer le Worker Cloudflare

```bash
# Installer Wrangler
npm install -g @cloudflare/wrangler

# Se connecter à Cloudflare
wrangler login

# Naviguer vers le dossier du worker
cd cloudflare-worker

# Publier le worker
wrangler publish
```

Le worker sera accessible à une URL du type `https://your-worker-name.workers.dev`.

### 3. Configurer le frontend

Dans `js/config.js`, mets à jour `PROXY_BASE_URL` avec l'URL de ton worker :

```javascript
const CONFIG = {
  PROXY_BASE_URL: "https://your-worker-name.workers.dev",
  // ... reste de la config
};
```

### 4. Déployer le site statique

**Option A : GitHub Pages**
```bash
git push origin main
# (GitHub Actions publie automatiquement les fichiers sur gh-pages)
```

**Option B : Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Option C : Autre hébergeur**
Copie simplement les fichiers vers ton serveur ou CDN.

## Configuration Worker

Le Worker (`cloudflare-worker/worker.js`) accepte les paramètres suivants :

```javascript
// URLs des Google Sheets (à jour)
const SHEET_URLS = {
  BUDGET: "https://...",
  EVOLUTION: "https://...",
  // ...
};

// Origines autorisées (sécurité)
const ALLOWED_ORIGINS = [
  "https://your-domain.com",
  "http://localhost:8000"
];
```

Pour restreindre l'accès, mets à jour `ALLOWED_ORIGINS` avant de déployer.

## Tests locaux

### Servir le site localement

```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

### Tester le Worker

```bash
# Test direct du worker (depuis terminal)
curl -i "https://your-worker.workers.dev/api/BUDGET"

# Vérifier le status et le format CSV
# Status: 200 OK
# Content-Type: text/csv
# Access-Control-Allow-Origin: <origin>
```

### Debugging dans le navigateur

1. Ouvrir DevTools (F12)
2. Onglet **Network** : vérifier les requêtes vers `/api/*`
3. Onglet **Console** : chercher les logs "Dashboard V5 chargé ✅"
4. Chercher les alertes visibles d'erreur (en haut à gauche)

## Troubleshooting

### Problème : Erreur 401 ou 403 sur les requêtes

**Cause** : Google Sheets non publique ou Worker restreint l'origine.

**Solution** :
1. Vérifier que les Google Sheets sont bien "Publier sur le web" (CSV)
2. Vérifier que l'origine du site est dans `ALLOWED_ORIGINS` du Worker
3. Tester avec curl sans origin (pour vérifier le backend)

### Problème : Données vides ou "Chargement..."

**Cause** : Fetch échoué, données en cache ou problème réseau.

**Solution** :
1. Ouvrir la Console et chercher les erreurs
2. Vérifier la tab **Network** pour voir le statut des requêtes /api/*
3. Si Worker retourne 502, vérifier que Google Sheets sont accessibles
4. Nettoyer le cache localStorage : `localStorage.clear()`

### Problème : Thème ne persiste pas

**Cause** : localStorage désactivé ou erreur JS.

**Solution** :
1. Vérifier que localStorage est activé (DevTools → Application → Storage)
2. Vérifier qu'il n'y a pas d'erreur JS dans la console

## Nouvelles fonctionnalités (v5+)

### KPIs additionnels
- **Taux d'épargne exact** = (Revenus - Dépenses) / Revenus
- **Mois de couverture** = Cash disponible / (Dépenses mensuelles)
- **Exposition investissements** = Investissements totaux / Patrimoine

### Améliorations charts
- Moyenne mobile 3 mois sur l'évolution du patrimoine
- Tooltips FR adaptés au thème
- Donut allocation avec total central formaté

### Robustesse
- **Retry automatique** : si fetch échoue, retry 1x après 1s
- **Cache client** : fallback localStorage si Worker indisponible
- **Alertes visibles** : affichage des erreurs réseau dans l'UI
- **Gestion d'erreurs** : catch global + logging détaillé

## API disponibles (via Worker)

```
GET /api/BUDGET    → CSV KPIs budget
GET /api/PEA       → CSV KPIs PEA
GET /api/CTO       → CSV KPIs CTO (CHF)
GET /api/EVOLUTION → CSV série historique patrimoine
GET /api/OBJECTIF  → CSV objectifs cibles
```

Chaque requête retourne :
- **200 OK** : CSV valide
- **403 Forbidden** : origine non autorisée
- **502 Bad Gateway** : Google Sheets inaccessible
- **Content-Type** : text/csv; charset=utf-8
- **CORS headers** : Access-Control-Allow-Origin

## Sécurité

- **URLs protégées via Cloudflare Worker** : seules les origines autorisées accèdent aux données
- **localStorage** : données sensibles (taux d'épargne, patrimoine) restent côté client
- **Pas de credentials** : le Worker est public mais restreint par ALLOWED_ORIGINS
- **HTTPS** : toutes les requêtes doivent passer par HTTPS

## Performance

- **Caching client** : fallback localStorage en cas d'indisponibilité
- **Retry automatique** : 1 retry après 1s en cas d'erreur réseau
- **Charts optimisés** : lazy rendering, theme switching sans reload
- **CSV parsé côté client** : pas de transformation serveur

## Contributions

Les PR et suggestions sont bienvenues. Pour tout problème, ouvrir une issue.

## Licence

MIT
