# Historique — contexte transféré depuis Claude Desktop

Snapshot de la mémoire du projet "Dashboard finance" sur Claude Desktop,
importé le 2026-08-16. Origine : instructions de projet ("Purpose & context")
accumulées au fil des échanges jusqu'à la v5 du dashboard.

## Contexte général

Dashboard financier personnel hébergé sur GitHub Pages, utilisé
principalement comme PWA installée sur iOS pour le suivi financier
quotidien. Projet développé en autodidacte (pas un projet professionnel).
Suit la performance du portefeuille, le budget, et la progression vers le
FIRE (indépendance financière).

Sources de données : plusieurs Google Sheets — suivi budgétaire (feuilles
mensuelles + récapitulatifs annuels), suivi CTO (compte suisse, libellé en
CHF), suivi PEA. Un Cloudflare Worker garde les URLs des Sheets privées et
gère la logique côté serveur. Objectif UX/UI : sobre et moderne, inspiré
d'outils comme Finary, avec mode sombre/clair sur desktop et mobile.

## État du développement au moment du transfert

**Sécurité**
- Écran de verrouillage validé côté serveur via le Cloudflare Worker
  (`/api/auth`), avec protection anti-brute-force basique par IP.
- Face ID / Touch ID via passkeys WebAuthn (trousseau système, partagé entre
  Safari et le contexte PWA installé).
- Re-verrouillage uniquement sur `visibilitychange` (pas sur `blur`), avec
  une période de grâce de 30 secondes avant le re-lock.

**Calculs financiers**
- Conversion CHF→EUR corrigée pour le compte CTO.
- Compte cash YUH (en CHF) désormais correctement converti.
- Le patrimoine total est calculé à partir des valeurs de compte en direct
  (Cash + valeur PEA actuelle + CTO converti), plutôt qu'à partir du dernier
  point de données de la feuille "Evolution".

**Nouvelles fonctionnalités**
- "Performance par achat" intégrée directement dans les cartes de compte
  PEA/CTO existantes (lots d'achat individuels, tri chronologique, derrière
  un toggle secondaire).
- Service worker PWA en stratégie network-first.
- Barre de navigation mobile en bas d'écran (Accueil, Comptes, Historique,
  Objectifs).
- Bouton de rafraîchissement manuel dans le header.

**Restructuration UX**
- Suppression de la section redondante "Mes investissements".
- Le tracker FIRE remonté plus haut sur la page.

**Ajouts côté Google Sheets**
- Deux nouveaux onglets (`APICTOHistorique`, `APIPEAHistorique`) utilisant
  FILTER, VLOOKUP, ARRAYFORMULA.
- Routes Cloudflare Worker correspondantes ajoutées.

## Enseignements retenus

Ces règles de travail restent valables et ont été reprises dans `CLAUDE.md` :

- Discuter du placement/de la structure d'une fonctionnalité avant de coder
  — la fonctionnalité "Performance par achat" a dû être reconstruite trois
  fois faute d'accord préalable sur la disposition.
- Travailler à partir des fichiers réels du repo, pas d'hypothèses ou de
  documents/mémoire potentiellement obsolètes.
- Fournir des réécritures complètes de fichier plutôt que des extraits
  partiels.
- Les lignes `VENTE` du journal de transactions sont des enregistrements
  historiques intentionnels, pas des doublons à filtrer.
- `localStorage` est isolé entre Safari et la PWA installée sur iOS, mais le
  trousseau système est partagé — d'où le choix de WebAuthn/Face ID (qui
  fonctionne dans les deux contextes) plutôt qu'un état basé sur
  `localStorage`.
- Sens de la conversion CHF/EUR : diviser un montant EUR par le taux EUR/CHF
  pour obtenir des CHF ; multiplier un montant CHF par le taux EUR/CHF pour
  obtenir des EUR. Des erreurs de sens ont déjà causé des bugs ici.

## Outils & accès (contexte historique)

- Hébergement : GitHub Pages (repo `soudjaymoursala-netizen/Finance-dashboard`).
- Proxy/API : Cloudflare Worker — accès en lecture seule depuis Claude
  Desktop à l'époque (pas de capacité de déploiement direct).
- Données : Google Sheets, exportées en CSV via le Worker.
- Visualisation : ApexCharts, chargé depuis `cdn.jsdelivr.net`.

## Notes sur la mémoire de projet elle-même

Le projet Claude Desktop contenait aussi un fichier de connaissance
`style.css` qui s'est révélé être une version ancienne, déjà dépassée par
`css/style.css` dans le repo actuel (noms de variables différents,
structure différente). Il n'a pas été réimporté ici pour éviter toute
confusion — le fichier du repo fait foi. C'est une illustration directe de
la règle "travailler à partir des fichiers réels, pas de la mémoire".
