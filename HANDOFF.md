# Rapport de passation — Finance Dashboard

> Rédigé par une session Claude Code (remote) pour permettre à une session Claude Code locale de reprendre le travail avec tout le contexte nécessaire. Dernière mise à jour : 2026-11-08.

## 1. Vue d'ensemble du projet

Dashboard financier personnel, **site statique vanilla JS** (pas de build, pas de framework), hébergé sur **GitHub Pages**. Les données viennent de **Google Sheets** (export CSV), récupérées via un **Worker Cloudflare** qui fait proxy pour ne jamais exposer les URLs/IDs de Sheets côté client.

- **Repo** : `soudjaymoursala-netizen/Finance-dashboard`
- **Site live** : `https://soudjaymoursala-netizen.github.io/Finance-dashboard/` (à confirmer avec l'utilisateur — nom exact du repo GitHub Pages)
- **Worker proxy** : valeur par défaut dans `js/config.js` (`DEFAULT_PROXY_BASE_URL`)
- **Google Sheet principale** : titrée `Suivie Budget_Personnel` dans le Drive de l'utilisateur. Ce repo étant public, son ID n'est volontairement pas inscrit ici — la retrouver via une recherche Drive par titre (`search_files` avec `title contains 'Suivie Budget'`), ou demander le lien à l'utilisateur.

### Stack

- HTML/CSS/JS vanilla, aucun bundler
- [ApexCharts](https://apexcharts.com/) (CDN) pour tous les graphiques
- Cloudflare Worker (`cloudflare-worker/worker.js`) comme proxy CSV + endpoint d'auth du lock screen
- Pas de framework JS, chaque fonctionnalité = un petit fichier `js/*.js` chargé en `<script>` classique (pas de modules ES), tout vit dans le même scope global

### Doctrine design (importante, établie sur plusieurs sessions)

- **Un seul accent de marque** : emerald/vert (`--accent-color`) réservé au signal positif. Rouge (`--negative-color`) réservé au signal négatif réel (perte, alerte).
- **Les badges de catégorie sont neutres** : `.icon-badge.gold/.violet/.blue/.warn` sont volontairement **gris** (neutralisés) — ils indiquent une catégorie (compte, type d'actif), pas un signal financier. Ne jamais leur redonner de couleur vive.
- **`.icon-badge.emerald`** = signal positif. **`.icon-badge.negative`** = signal négatif (ajouté récemment, pour les pertes d'investissement).
- Donuts de répartition (allocation, composition PEA/CTO) : **palette monochrome** (dégradé d'un seul vert), jamais multi-teintes — ce n'est pas un signal, juste une proportion.
- Sections repliables à plusieurs niveaux ("je ne veux pas tout avoir d'un coup" — consigne explicite de l'utilisateur, répétée plusieurs fois).
- Typographie Inter, `tabular-nums` pour les montants, échelle resserrée (pas de gros titres criards).

## 2. État actuel

### Dernières fonctionnalités livrées

**A. Refonte visuelle + architecture**
1. Palette monochrome sur tous les graphiques ApexCharts + couleurs adaptées au thème (dark/light)
2. Focus-visible, animation d'entrée décalée sur les lignes d'investissement, derniers emoji remplacés par le système d'icônes SVG (sprite inline dans `index.html`, 25 icônes `currentColor`)
3. Graphique "Évolution du patrimoine" fusionné **dans la hero-card** (axes, grille, couleur de tendance) — supprimé de la section Graphiques, qui ne garde que les 3 donuts de répartition
4. Ordre des sections : Hero → Comptes → FIRE → Investissements → Graphiques → Budget
5. Bottom-nav mobile corrigée (ancres fausses, ajout d'une entrée "Investissements", 5 items au total)
6. **Module "Budget" à onglets** (`js/budgetTabs.js`) : fusionne Suivi mensuel + Budget annuel + Objectifs d'épargne, 3 onglets (Mensuel/Annuel/Épargne), onglet "Mensuel" caché tant qu'aucune donnée n'est disponible
7. Mini-donut de composition intégré dans le détail déplié de chaque carte compte (PEA/CTO)

**B. Insights Dépenses + Investissement**
1. **Onglet "Dépenses"** (4e onglet du module Budget, `js/depenses.js`) : phrases en langage naturel —
   - "Votre poste de dépense le plus important est X avec Y€ (Z% de vos dépenses annuelles)"
   - Conseils d'économie concrets par catégorie
   - "Challenge : il vous manque X€ pour atteindre [objectif], délai estimé Y mois"
   - Alimenté par le nouvel onglet Sheet `API_DEPENSES_CATEGORIES` (voir section 4)
2. **Bloc insights Investissement** (en tête de "Mes investissements", `js/investissementInsights.js`) :
   - Plus gros gain / plus grosse perte depuis l'achat (toutes positions PEA+CTO, converties en € pour comparer)
   - Alerte de concentration si une ligne dépasse 25% du portefeuille
   - **Purement informatif, calculé en JS à partir des données déjà chargées — aucun appel réseau, aucune API externe, aucun conseil d'achat/vente**
3. Fix d'un bug réel dans `cloudflare-worker/worker.js` : la regex de routage `^/api/([A-Z]+)$` ne matchait jamais les clés contenant un underscore (`CTO_HISTORIQUE`, `PEA_HISTORIQUE`) — corrigée en `[A-Z_]+`. **Potentiellement cassé en prod depuis le début si ces clés sont utilisées.**

### ⚠️ Action manuelle requise AVANT que "Dépenses" fonctionne en ligne

Le Worker Cloudflare **n'est pas redéployé automatiquement depuis Git** (confirmé dans `cloudflare-worker/README.md`) — il faut coller le code à la main :

1. `https://dash.cloudflare.com` → Workers & Pages → le Worker du projet → **Edit code**
2. Coller le contenu de `cloudflare-worker/worker.js` (version à jour sur `main`) → **Deploy**
3. Settings → Variables and Secrets → Add → **`SHEET_DEPENSES`** (type Secret) = l'URL CSV d'export de l'onglet `API_DEPENSES_CATEGORIES` de la Sheet `Suivie Budget_Personnel` (format `https://docs.google.com/spreadsheets/d/{ID_DE_LA_SHEET}/export?format=csv&gid={ID_DE_L_ONGLET}` — mêmes IDs que les autres secrets `SHEET_*` déjà configurés pour ce même fichier, juste un `gid` différent pour ce nouvel onglet)
4. Vérifier aussi `SHEET_CTO_HISTORIQUE` et `SHEET_PEA_HISTORIQUE` : si ces fonctionnalités semblaient ne jamais marcher en prod, c'était probablement le bug de regex ci-dessus — redéployer suffit à corriger.

Sans cette étape, `js/depenses.js` reste silencieusement inactif (`window.CONFIG.URL_DEPENSES` vide → la fonction retourne tôt, pas d'erreur visible) — c'est le comportement voulu pour une feature optionnelle, mais ça peut donner l'impression que "ça ne marche pas" alors que c'est juste la config manquante.

## 3. Architecture des données

```
Google Sheets (plusieurs fichiers) → export CSV
         ↓
Worker Cloudflare (proxy, cache les URLs) : /api/{KEY} → env.SHEET_{KEY}
         ↓
js/config.js (construit window.CONFIG.URL_*)
         ↓
js/googleSheets.js : chargerDashboard() orchestre tout, séquence d'awaits
         ↓
Modules spécialisés (un fichier par feature) : parsing + rendu DOM direct
```

Chaque feature optionnelle suit le même pattern défensif : si `window.CONFIG.URL_X` est vide ou le fetch échoue, la fonction **retourne silencieusement** (pas d'alerte, pas d'erreur) — la section correspondante reste cachée (`style="display:none"` par défaut, révélée par JS une fois les données confirmées présentes).

### Fichier `js/config.js`

Construit les URLs via `buildSheetUrl(key, viteKey)` : priorité env injecté > `window.URL_*` > localStorage > `PROXY_BASE_URL + "/api/" + key`. Chaque `SHEETS.X` a une clé `KEY` qui correspond exactement au nom attendu côté Worker (`ALLOWED_KEYS` dans `worker.js`) et au nom du secret Cloudflare (`SHEET_{KEY}`).

### Google Sheet principale — structure complète des onglets

Fichier `Suivie Budget_Personnel` (retrouver son ID via une recherche Drive par titre, voir section 1) :

| Onglet | Rôle |
|---|---|
| `Sommaire` | Navigation interne à la Sheet |
| `📆 [Mois] 2026` (un par mois, Mars→Novembre 2026) | Saisie détaillée des dépenses fixes/variables, France + Suisse, par catégorie. Présentation riche (émojis, cellules fusionnées, 2 devises) — **ne jamais parser ça directement en CSV côté dashboard**, trop fragile. |
| `📅 Budget 2026` | Vue annuelle consolidée, alimente `📊 Analyse & KPI` |
| `📊 Analyse & KPI` | **Tableau de bord automatique**, 100% formules, aucune saisie. Contient : chiffres clés, suivi mensuel, répartition par catégorie (lignes 35-44), simulation "réduction de 10%" avec conseils (lignes 67-71), projections d'objectifs avec délai estimé (lignes 75-79), règle 50/30/20. **C'est la source de vérité pour tous les insights "Dépenses".** |
| `API_BUDGET` | KPI clé/valeur (cash, revenus/dépenses/épargne annuels...) — alimente `BUDGET.csv` |
| `API_EVOLUTION` | Historique mensuel du patrimoine total — alimente `EVOLUTION.csv` |
| `API_BUDGET_MENSUEL` | MOIS/REVENUS/DEPENSES/EPARGNE/INVESTISSEMENT par mois — alimente le "Suivi mensuel". **Maintenu à la main** (une ligne par mois ajoutée manuellement, `nov_26`/`Dec_26` existent en stub vide) |
| `API_OBJECTIF` | OBJECTIF/CIBLE/ACTUEL (appartement, voiture, vacances, fonds_urgence, patrimoine_total, + les 4 `*_annuel`) |
| `API_DEPENSES_CATEGORIES` | **Nouveau, créé récemment**. Colonnes `TYPE,NOM,VALEUR_PRINCIPALE,VALEUR_SECONDAIRE,DETAIL`. `TYPE="categorie"` (10 lignes, référence `📊 Analyse & KPI!C35:E44` + conseils `G67/G68/G69/G70/G71`), `TYPE="challenge"` (5 lignes, référence `📊 Analyse & KPI!E75:G79` + `H75:H79`). **Toutes les valeurs sont des formules `='📊 Analyse & KPI'!XXX`, pas de valeurs en dur** — si la mise en page de l'onglet Analyse & KPI change, ces formules cassent (voir section 5). |
| `Explication tag` | Vide/notes |

Sheets séparées (pas dans ce fichier) référencées par le dashboard : PEA, CTO, et leurs onglets historique (`API_PEA_Historique`, `API_CTO_Historique`) — contiennent les positions individuelles (ticker, date, prix, quantité, gain, perf), 10 colonnes, utilisées par `js/historiqueAchats.js`.

## 4. Fichiers JS — rôle de chacun (pattern "un fichier = une feature optionnelle")

| Fichier | Rôle | Dépend de |
|---|---|---|
| `js/config.js` | Construit `window.CONFIG`, doit charger en premier | — |
| `js/parsing.js` | Fonctions pures : `nettoyerNombre`, `detectSeparator`, `splitCsvLine`, `formatEUR/CHF`, `estErreurFormule` | — |
| `js/charts.js` | Tous les graphiques ApexCharts, helpers couleur theme-aware (`getStatusColor`, `getMonoPalette`, `getCssVar`) | parsing.js |
| `js/googleSheets.js` | **Orchestrateur principal** `chargerDashboard()`, appelle tous les modules optionnels en séquence | tous |
| `js/suiviAnnuel.js` | Onglet "Mensuel" du module Budget | — |
| `js/historiqueAchats.js` | Positions individuelles PEA/CTO, alimente `historiqueComptesGroupes` (variable globale réutilisée ailleurs) | — |
| `js/investissementInsights.js` | **Nouveau.** Lit `historiqueComptesGroupes`, calcule gain/perte/concentration | historiqueAchats.js (runtime, pas parse-time) |
| `js/depenses.js` | **Nouveau.** Fetch + parse `API_DEPENSES_CATEGORIES`, génère les phrases | parsing.js |
| `js/investissements.js` | Vue unifiée filtrable "Mes investissements" | historiqueAchats.js |
| `js/budgetTabs.js` | Système d'onglets générique (`[data-tab]` + `.budget-tab-panel[data-panel]`), expose `window.activerOngletBudget(tab)` | — |
| `js/collapsibleSections.js` | Système accordéon générique, groupes exclusifs via `groupId` (ex: les 3 cartes Comptes se ferment entre elles) | — |
| `js/bottomNav.js` | Nav mobile, scroll-to + activation d'onglet via `data-tab` optionnel sur un item | budgetTabs.js (optionnel, lazy) |
| `js/lock.js` | Écran de verrouillage, code vérifié côté Worker (`/api/auth`) | — |

### Piège CSS à connaître (déjà rencontré 2 fois)

Le système d'onglets (`budgetTabs.js`) régit la visibilité d'un panneau **uniquement via la classe** `.budget-tab-panel` / `.budget-tab-panel.active` (CSS, `display:none`/`block`). **Ne jamais ajouter `style="display:none"` inline sur un `.budget-tab-panel`** — un style inline a une spécificité CSS supérieure à une classe et écrase silencieusement le système d'onglets (bug déjà rencontré et corrigé sur le panneau "Dépenses"). Pour cacher un onglet tant que ses données ne sont pas prêtes, cacher le **bouton** (`#budgetTabXxx { display:none }` inline, révélé par JS), jamais le panneau.

De même, `.chart-small`/`.chart-mini` doivent être déclarées **après** la règle `.chart { height: 300px }` dans `style.css` pour que leur hauteur gagne en cascade (même spécificité, l'ordre de déclaration tranche) — bug déjà rencontré une fois sur `.chart-mini`.

## 5. Risques / dette technique connus

1. **`API_DEPENSES_CATEGORIES` référence des cellules fixes** de `📊 Analyse & KPI` (ex: `C35`, `G67`). Si l'utilisateur réorganise cet onglet (ajoute/supprime une ligne dans la répartition par catégorie ou les simulations), **les formules se décaleront silencieusement** et pointeront vers les mauvaises cellules. Pas de garde-fou côté Sheet ni côté dashboard pour détecter ça — à surveiller si l'utilisateur modifie sa Sheet.
2. **Onglet mensuel `📆 Novembre 2026` a un titre resté sur "JUILLET 2026"** (cellule A1, copier-coller non mis à jour) — pas un bug dashboard, mais à signaler à l'utilisateur s'il le remarque.
3. **`API_BUDGET_MENSUEL` est maintenu à la main** (pas de formule automatique détectée qui ajoute le mois courant) — les lignes `nov_26`/`Dec_26` existent mais vides. L'onglet "Mensuel" du dashboard restera vide pour ces mois tant que l'utilisateur (ou quelqu'un) n'y colle pas les valeurs.
4. **`js/investissementInsights.js` compare gain/perte "depuis l'achat", pas "ce mois-ci"** — volontairement, car `historiqueComptesGroupes` ne contient pas d'historique de valeur par titre dans le temps, seulement un total cumulé. Si l'utilisateur redemande un vrai "ce mois-ci", il faudrait soit un nouvel onglet Sheet avec un snapshot mensuel par position, soit l'accepter comme limitation.
5. **Pas de build/versioning automatique** : chaque fichier CSS/JS modifié doit avoir son `?v=N` bumpé à la main dans `index.html` (cache-busting GitHub Pages). Grep `\.js?v=\|\.css?v=` dans `index.html` pour voir l'état actuel.

## 6. Méthodologie de test utilisée dans cette session

Pas de suite de tests automatisés dans le repo. La vérification se fait via **Playwright headless** monté à la volée dans un répertoire temporaire (pas versionné, à recréer à chaque nouvelle session) :

```bash
mkdir -p /tmp/.../fixtures /tmp/.../shots
cd /tmp/... && npm init -y && npm install playwright --no-save
npm pack apexcharts --pack-destination . && tar -xzf apexcharts-*.tgz
```

Puis un script Node qui :
1. Lance Chromium headless
2. Intercepte `https://cdn.jsdelivr.net/npm/apexcharts` → sert le `.tgz` local (évite une dépendance réseau)
3. Intercepte `https://mockproxy.test/api/**` → sert des fixtures CSV locales (une par clé : `BUDGET.csv`, `PEA.csv`, `CTO.csv`, `EVOLUTION.csv`, `OBJECTIF.csv`, `MENSUEL.csv`, `PEA_HISTORIQUE.csv`, `CTO_HISTORIQUE.csv`, `DEPENSES.csv`)
4. Injecte `window.PROXY_BASE_URL = 'https://mockproxy.test'` + `sessionStorage.financeDashboard_unlocked = '1'` (bypass le lock screen)
5. Sert `index.html` via un serveur HTTP local
6. Capture les erreurs console/page et des screenshots ciblés

Les fixtures CSV doivent respecter le format EXACT attendu par chaque parser (voir section 4 pour le nombre de colonnes et les noms de clés attendus).

## 7. Backlog / pistes non traitées (mentionnées par l'utilisateur, pas encore faites)

- L'utilisateur a demandé à l'origine un comparatif d'assurances/abonnements ("vous pourriez économiser chez tel assureur") — **explicitement retiré du scope** après discussion (aucune API fiable pour scraper des prix d'assurance en live ; si redemandé, prévoir une saisie manuelle par l'utilisateur plutôt qu'une recherche automatique).
- Un flux de news financières a été évoqué puis écarté (pas d'API gratuite fiable type Yahoo Finance, et ça glisse vers du conseil en investissement — à éviter, rester informatif).
- Pas de section "ce mois-ci" pour les dépenses (actuellement "cette année") — pourrait être ajouté si l'utilisateur a besoin d'un focus mensuel, en lisant `API_BUDGET_MENSUEL` déjà fetché ailleurs.

## 8. Accès requis pour continuer

- **Écriture sur la Google Sheet** : cette session avait accès en écriture via un MCP Google Sheets (`get_values`/`update_values`/`update_formulas`/`update_spreadsheet`). Si la session locale n'a pas cet accès, elle doit soit demander à l'utilisateur de faire les modifs à la main dans Sheets, soit lui donner des instructions précises (cellule par cellule) — **ne jamais halluciner un accès en écriture qu'on n'a pas, vérifier d'abord avec un outil `search`/`list` léger**.
- **Déploiement du Worker Cloudflare** : aucune session (ni celle-ci ni probablement la locale) n'a d'accès déploiement direct au Worker. Toujours donner les instructions de copier-coller manuel (voir section 2).
- **Repo Git** : le code est déjà poussé sur `main`, aucune action supplémentaire requise pour y accéder en clonant/pullant normalement.
