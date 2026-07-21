# Proxy Cloudflare Worker

Ce Worker cache les URLs de vos Google Sheets, pour que le dashboard
puisse rester hébergé sur GitHub Pages (site 100% statique et public)
sans exposer vos identifiants de Sheet.

## Déploiement (gratuit, ~5 minutes)

1. Allez sur https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**
2. Donnez-lui un nom (ex: `finance-dashboard-proxy`), déployez le squelette par défaut
3. **Edit code** → collez le contenu de `worker.js` → **Deploy**
4. **Settings** → **Variables and Secrets** → **Add**, ajoutez ces variables
   en tant que **Secret** (pas "Text") :
   - `SHEET_BUDGET`
   - `SHEET_EVOLUTION`
   - `SHEET_OBJECTIF`
   - `SHEET_PEA`
   - `SHEET_CTO`
   - `SHEET_MENSUEL` (optionnel, suivi mensuel)
   - `LOCK_CODE` — le code d'accès de l'écran de verrouillage (remplace la
     constante `CODE` qui était en clair dans `js/lock.js`). Choisissez une
     valeur ici, c'est elle qui compte désormais ; le code côté client a
     été retiré.

   Valeur des `SHEET_*` = l'URL complète d'export CSV du Google Sheet correspondant
   (celle qui était avant dans `config.js`, format
   `https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=...`)

5. Ajoutez aussi une variable **Text** (non secrète) :
   - `ALLOWED_ORIGIN` = `https://soudjaymoursala-netizen.github.io`
     (adaptez si vous utilisez un domaine personnalisé)

6. Notez l'URL du Worker affichée en haut (ex: `https://finance-dashboard-proxy.VOTRE-SOUS-DOMAINE.workers.dev`)

7. Dans `js/config.js`, remplacez la valeur de `PROXY_BASE_URL` par cette URL,
   committez et poussez.

## Vérification

Une fois déployé, testez dans le navigateur :
`https://VOTRE-WORKER.workers.dev/api/BUDGET` → doit renvoyer du CSV.

Si vous obtenez "Forbidden", vérifiez que `ALLOWED_ORIGIN` correspond
exactement à l'URL de votre site GitHub Pages.
