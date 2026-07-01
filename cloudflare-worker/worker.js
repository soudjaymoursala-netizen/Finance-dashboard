// Cloudflare Worker to proxy Google Sheets CSV exports with ALLOWED_ORIGIN
// Deploy this Worker and set CONFIG.PROXY_BASE_URL to the workers.dev URL

const SHEET_URLS = {
  BUDGET: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSq5EMGQYPvA9CZrUkdteiVl09VLnBQyHK6mQQJwzPkf0xTJO1Igb8YnelcKpnt-X9U84QcQsSsjR5U/pub?gid=519498006&single=true&output=csv",
  EVOLUTION: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSq5EMGQYPvA9CZrUkdteiVl09VLnBQyHK6mQQJwzPkf0xTJO1Igb8YnelcKpnt-X9U84QcQsSsjR5U/pub?gid=810332816&single=true&output=csv",
  OBJECTIF: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSq5EMGQYPvA9CZrUkdteiVl09VLnBQyHK6mQQJwzPkf0xTJO1Igb8YnelcKpnt-X9U84QcQsSsjR5U/pub?gid=1700667008&single=true&output=csv",
  PEA: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7PqQh0xFLqHVGrpEUiTyWuJ4-bPXgEWMsP3tVSfZVPJ48a_NCZYZ5Pz_j84HlDDx1PYNg_4tXVDT1/pub?gid=1971681206&single=true&output=csv",
  CTO: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRNhqLr93FnYOiAaVFXQPNwBl9_0-KV1xvQ8KJ9c8B3xKWu5p8J6vC_zUJPPRCzL4L_CvxvLhZwEW2O/pub?gid=1361663202&single=true&output=csv"
};

// Optional: set an allowed origin to prevent misuse. Set to null to allow all.
// Recommended: restrict to your domain(s)
const ALLOWED_ORIGINS = [
  "https://soudjaymoursala-netizen.github.io",
  "http://localhost:8000",
  "http://localhost:3000"
];

const ALLOW_ALL = false; // set to true to disable origin restriction

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  const allowed = ALLOW_ALL ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : null);
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  if (allowed) {
    headers['Access-Control-Allow-Origin'] = allowed;
  }
  
  return headers;
}

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }
  
  // Check origin
  if (!ALLOW_ALL) {
    const origin = request.headers.get('Origin');
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden origin', { status: 403, headers: getCorsHeaders(request) });
    }
  }

  // Expect paths like /api/BUDGET or /api/PEA
  const match = url.pathname.match(/^\/api\/(BUDGET|EVOLUTION|OBJECTIF|PEA|CTO)$/i);
  if (!match) {
    return new Response('Not found', { status: 404, headers: getCorsHeaders(request) });
  }

  const key = match[1].toUpperCase();
  const target = SHEET_URLS[key];
  if (!target) {
    return new Response('Sheet not configured', { status: 500, headers: getCorsHeaders(request) });
  }

  try {
    const resp = await fetch(target, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,*/*'
      }
    });

    const body = await resp.text();
    const headers = Object.assign({ 'Content-Type': 'text/csv; charset=utf-8' }, getCorsHeaders(request));
    
    return new Response(body, { status: resp.status, headers });
  } catch (err) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request));
    return new Response(JSON.stringify({ error: 'worker_error', message: err.message }, null, 2), { status: 500, headers });
  }
}
