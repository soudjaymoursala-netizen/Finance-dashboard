/**
 * Worker Cloudflare — proxy pour Finance Dashboard
 *
 * Rôle : cacher les IDs des Google Sheets. Le navigateur appelle
 * ce Worker (ex: https://finance-dashboard-proxy.VOTRE-SOUS-DOMAINE.workers.dev/api/BUDGET)
 * et le Worker va chercher les vraies données côté serveur.
 *
 * Déploiement (5 min, gratuit) :
 * 1. https://dash.cloudflare.com -> Workers & Pages -> Create -> Create Worker
 * 2. Collez ce code dans l'éditeur, cliquez "Deploy"
 * 3. Allez dans Settings -> Variables and Secrets -> Add -> pour CHAQUE clé
 *    ci-dessous, ajoutez une variable de type "Secret" (pas "Text") :
 *      SHEET_BUDGET, SHEET_EVOLUTION, SHEET_OBJECTIF, SHEET_PEA, SHEET_CTO
 *    Valeur = l'URL complète d'export CSV de chaque Google Sheet.
 * 4. Settings -> Variables and Secrets -> ALLOWED_ORIGIN (Text, pas secret)
 *    = https://soudjaymoursala-netizen.github.io  (adaptez si domaine perso)
 * 5. Notez l'URL du Worker (ex: https://finance-dashboard-proxy.xxx.workers.dev)
 *    -> à mettre dans js/config.js (voir instructions séparées)
 */

const ALLOWED_KEYS = ["BUDGET", "EVOLUTION", "OBJECTIF", "PEA", "CTO"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const match = url.pathname.match(/^\/api\/([A-Z]+)$/);
    if (!match || !ALLOWED_KEYS.includes(match[1])) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const key = "SHEET_" + match[1];
    const sheetUrl = env[key];

    if (!sheetUrl) {
      return new Response("Missing config: " + key, { status: 500, headers: corsHeaders });
    }

    const sheetResp = await fetch(sheetUrl);
    const body = await sheetResp.text();

    return new Response(body, {
      status: sheetResp.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  },
};
