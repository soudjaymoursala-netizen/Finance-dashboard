# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Finance-dashboard is a **100% static, vanilla-JS** personal finance dashboard (PWA). No build step, no bundler, no framework, no package.json. It displays net worth, budget, PEA/CTO investment KPIs and charts, sourced from CSV exports of Google Sheets.

There are no automated tests, no linter, and no build/dev-server tooling in this repo. To "run" the app, open `index.html` directly in a browser or serve the directory with any static file server (e.g. `python3 -m http.server`). There is no compile/test/lint command to run before committing.

## Architecture

**Two deployable pieces:**
1. **Static site** (root) — `index.html`, `css/`, `js/`, `icons/`, `manifest.json`, `sw.js` — deployed as-is to GitHub Pages.
2. **`cloudflare-worker/worker.js`** — an optional Cloudflare Worker deployed *separately* (pasted manually into the Cloudflare dashboard, not built/deployed from this repo via CLI). It proxies Google Sheets CSV exports so the sheet URLs/IDs never appear in client-side code, and it verifies the lock-screen access code server-side via the `LOCK_CODE` secret (see `cloudflare-worker/README.md`).

**Script loading is order-dependent global scope, not modules.** `index.html` loads each `js/*.js` file via plain `<script src="...">` tags (see the list near the end of `index.html`); every file attaches functions/state to the global scope (or an IIFE closure) and later scripts assume earlier ones already ran. When adding a new JS file, it must be added to `index.html` in the correct position **and** to `PRECACHE_URLS` in `sw.js`.

**Config resolution (`js/config.js`)** builds each Google Sheet's effective URL with this priority: injected `env.VITE_*` > `window.URL_*` > `localStorage` (`VITE_*` or `URL_*`, settable via the ⚙️ config panel, see `js/runtimeConfigUI.js`) > Cloudflare Worker proxy (`PROXY_BASE_URL + /api/<KEY>`). It exposes the result as `window.CONFIG` (flat `URL_*` keys) which the rest of the app reads.

**Data flow:** `js/googleSheets.js` (`chargerDashboard()`) is the orchestrator — it fetches each sheet's CSV (via `js/dataCache.js`'s `fetchTextOrLog`, which falls back to the last successfully-fetched CSV in `localStorage` if the network/Worker fails), parses it with `js/parsing.js` (`lireCSVKPI`, tolerant of `,` vs `;` separators and French number formatting like `1 234,56`), computes derived KPIs into the `DATA` object, and writes them into the DOM (`DOM` object of element references) and into ApexCharts instances (`js/charts.js`).

**Other JS modules** are feature-scoped and mostly independent: `lock.js` (PIN lock screen + WebAuthn/Face ID convenience layer, verified server-side by the Worker), `mouvements.js`, `suiviAnnuel.js`, `historiqueAchats.js` (per-purchase PEA/CTO performance), `celebration.js`, `bottomNav.js`, `collapsibleSections.js`, `pullToRefresh.js`, `rippleEffect.js`, `errorHandler.js` (global `window.onerror`/`unhandledrejection` handler plus `showError`/`showSuccess`/`addAlert` writing to the `#alerts` DOM container — this is the standard way to surface errors to the user, not `alert()` or silent console logging).

**Service worker (`sw.js`)** caches only the static app shell (network-first, falls back to cache when offline) — it deliberately does not intercept calls to the Cloudflare Worker or Google Sheets. **`CACHE_VERSION` in `sw.js` must be bumped manually whenever any precached file's content changes**, otherwise already-installed users won't get the update. Script tags in `index.html` use a `?v=N` query string per file for the same cache-busting purpose — bump it when editing a given file.

**Secrets:** actual Google Sheets URLs and `LOCK_CODE` live only as Cloudflare Worker secrets (`SHEET_*`, `LOCK_CODE`, set in the Cloudflare dashboard), never committed. `.env.example` documents the two supported setups (Worker proxy vs. directly public sheet URLs via `VITE_URL_*`).

## Working conventions

- **Discuss layout/placement before writing code for a new UI feature.** Past feature work ("Performance par achat") had to be rebuilt three times because the structure wasn't agreed upfront — align on where/how something renders before implementing it.
- **Read the actual current files before suggesting changes or critiquing existing code.** Don't rely on assumptions or stale docs/memory of a previous state — this repo has moved fast (currently `sw.js` `CACHE_VERSION` shell-v12) and out-of-date mental models lead to wrong suggestions.
- **Give complete file rewrites when editing a file, not partial snippets.**
- See `docs/project-context/` for the fuller history of how the dashboard evolved (imported from prior Claude Desktop project memory) — useful background, but the code is always the source of truth for current state.

## Domain-specific correctness rules

- **CHF ⇄ EUR conversion direction:** divide an EUR amount by the EUR/CHF rate to get CHF; multiply a CHF amount by the EUR/CHF rate to get EUR. Sign/direction errors here have caused real bugs before (the CTO account is CHF-denominated at a Swiss broker; the YUH cash account is also CHF).
- **`VENTE` (sale) rows in the transaction journal are intentional historical records**, not duplicates — never deduplicate or filter them out.
- **iOS PWA vs Safari:** `localStorage` is isolated between Safari and the installed PWA (separate storage contexts), but the system keychain is shared — this is why `js/lock.js` uses WebAuthn/Face ID (works consistently across both) rather than `localStorage`-based auth state.

## Relevant skills

When changing anything about the charts, KPI cards, or overall dashboard visual design, consult the `dataviz` skill for color/accessibility/layout guidance before implementing.
