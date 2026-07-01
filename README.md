# Finance-dashboard

Tableau de bord statique (vanilla JS) qui affiche des KPI financiers et des graphiques à partir de CSV exportés depuis Google Sheets. Le projet propose un Cloudflare Worker optionnel pour proxifier les URLs de Google Sheets et éviter d'exposer les identifiants dans le front.

Principales options d'installation:

1) Utiliser le Cloudflare Worker (recommandé si vos Sheets ne sont pas publics)

- Déployez le Worker en suivant cloudflare-worker/README.md.
- Dans les Settings du Worker, ajoutez (Secret) : SHEET_BUDGET, SHEET_EVOLUTION, SHEET_OBJECTIF, SHEET_PEA, SHEET_CTO — chacune = l'URL d'export CSV de la Google Sheet.
- Ajoutez (Text) : ALLOWED_ORIGIN = l'URL exacte de votre site (ex: https://soudjaymoursala-netizen.github.io).
- Copiez l'URL du Worker (ex: https://mon-worker.workers.dev) et mettez-la dans js/config.js → PROXY_BASE_URL.
- Commit & déployez le site (GitHub Pages) : index.html chargera le Worker pour récupérer les CSV.

2) Ne pas utiliser de Worker (Sheets publiques)

- Si vos Google Sheets sont publiques (export CSV accessible sans auth), vous pouvez définir des variables `VITE_URL_*` (voir .env.example) ou modifier directement `js/config.js` pour mettre les URLs publiques.
- Ouvrez index.html localement ou publiez sur GitHub Pages.

Dépannage rapide

- Ouvrez la console du navigateur (F12) → onglet Network/Console. Si vous voyez des 403 depuis le Worker, vérifiez ALLOWED_ORIGIN.
- Si fetch échoue (404/Network error), vérifiez que PROXY_BASE_URL est correct ou que les VITE_URL_* sont accessibles.

Pour corriger automatiquement la configuration, voir les modifications dans js/config.js et js/errorHandler.js qui ajoutent des messages d'erreur clairs dans l'UI.
