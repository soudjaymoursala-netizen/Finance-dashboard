/* Panneau de configuration de secours : ne s'affiche que si une URL de
   source de donnees venait a manquer (normalement jamais, grace au
   fallback DEFAULT_PROXY_BASE_URL dans config.js). Sert de filet de
   securite pour reconfigurer sans toucher au code. */
(function () {
  function createPanel() {
    const existing = document.getElementById('runtime-config-panel');
    if (existing) return;

    const panel = document.createElement('div');
    panel.id = 'runtime-config-panel';
    panel.innerHTML = `
      <button id="runtime-config-toggle" aria-label="Configuration avancée">⚙️</button>
      <div id="runtime-config" class="runtime-config-hidden">
        <h3>⚠️ Configuration avancée</h3>
        <p>Une ou plusieurs sources de données sont introuvables. Renseignez ici les URLs manuellement (ou laissez vide si vous utilisez le Worker proxy habituel).</p>
        <label>Budget<br><input id="rc-url-budget" type="text" placeholder="https://..."/></label>
        <label>CTO<br><input id="rc-url-cto" type="text" placeholder="https://..."/></label>
        <label>PEA<br><input id="rc-url-pea" type="text" placeholder="https://..."/></label>
        <label>Évolution<br><input id="rc-url-evolution" type="text" placeholder="https://..."/></label>
        <label>Objectif<br><input id="rc-url-objectif" type="text" placeholder="https://..."/></label>
        <div class="rc-actions">
          <button id="rc-save">Enregistrer et recharger</button>
          <button id="rc-clear" class="rc-secondary">Réinitialiser</button>
        </div>
        <small>Ces valeurs sont stockées uniquement dans ce navigateur (localStorage), jamais envoyées ailleurs.</small>
      </div>
    `;

    document.body.appendChild(panel);

    const style = document.createElement('style');
    style.textContent = `
      #runtime-config-panel{position:fixed;right:16px;bottom:16px;z-index:9999;font-family:'Inter',sans-serif}
      #runtime-config-toggle{background:#141B2E;color:#F1F5F9;border:1px solid rgba(255,255,255,0.1);border-radius:9999px;width:2.75rem;height:2.75rem;cursor:pointer;font-size:1.1rem;box-shadow:0 8px 24px rgba(0,0,0,0.35)}
      #runtime-config{background:linear-gradient(150deg,#141B2E,#1C2740);color:#F1F5F9;padding:1.25rem;border-radius:14px;border:1px solid rgba(255,255,255,0.08);margin-top:0.5rem;min-width:320px;box-shadow:0 8px 24px rgba(0,0,0,0.35)}
      #runtime-config h3{font-family:'Sora',sans-serif;font-size:0.95rem;margin:0 0 0.5rem}
      #runtime-config p{font-size:0.8rem;color:#8A94A6;margin:0 0 0.75rem}
      #runtime-config label{display:block;margin:0.5rem 0;font-size:0.75rem;font-weight:600;color:#8A94A6;text-transform:uppercase;letter-spacing:0.04em}
      #runtime-config input{width:100%;padding:0.5rem 0.65rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#0B1120;color:#F1F5F9;font-family:'Inter',sans-serif;margin-top:0.25rem}
      #runtime-config small{display:block;margin-top:0.75rem;font-size:0.7rem;color:#8A94A6}
      .rc-actions{display:flex;gap:0.5rem;margin-top:0.75rem}
      #rc-save{flex:1;background:#2DD4A7;color:#0B1120;border:none;border-radius:8px;padding:0.55rem;font-weight:700;cursor:pointer}
      .rc-secondary{background:transparent;color:#8A94A6;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:0.55rem 0.8rem;cursor:pointer}
      .runtime-config-hidden{display:none}
    `;
    document.head.appendChild(style);

    const toggle = document.getElementById('runtime-config-toggle');
    const box = document.getElementById('runtime-config');
    toggle.addEventListener('click', () => {
      box.classList.toggle('runtime-config-hidden');
    });

    // Prefill from localStorage
    document.getElementById('rc-url-budget').value = localStorage.getItem('VITE_URL_BUDGET') || localStorage.getItem('URL_BUDGET') || '';
    document.getElementById('rc-url-cto').value = localStorage.getItem('VITE_URL_CTO') || localStorage.getItem('URL_CTO') || '';
    document.getElementById('rc-url-pea').value = localStorage.getItem('VITE_URL_PEA') || localStorage.getItem('URL_PEA') || '';
    document.getElementById('rc-url-evolution').value = localStorage.getItem('VITE_URL_EVOLUTION') || localStorage.getItem('URL_EVOLUTION') || '';
    document.getElementById('rc-url-objectif').value = localStorage.getItem('VITE_URL_OBJECTIF') || localStorage.getItem('URL_OBJECTIF') || '';

    document.getElementById('rc-save').addEventListener('click', () => {
      localStorage.setItem('VITE_URL_BUDGET', document.getElementById('rc-url-budget').value.trim());
      localStorage.setItem('VITE_URL_CTO', document.getElementById('rc-url-cto').value.trim());
      localStorage.setItem('VITE_URL_PEA', document.getElementById('rc-url-pea').value.trim());
      localStorage.setItem('VITE_URL_EVOLUTION', document.getElementById('rc-url-evolution').value.trim());
      localStorage.setItem('VITE_URL_OBJECTIF', document.getElementById('rc-url-objectif').value.trim());
      location.reload();
    });

    document.getElementById('rc-clear').addEventListener('click', () => {
      localStorage.removeItem('VITE_URL_BUDGET');
      localStorage.removeItem('VITE_URL_CTO');
      localStorage.removeItem('VITE_URL_PEA');
      localStorage.removeItem('VITE_URL_EVOLUTION');
      localStorage.removeItem('VITE_URL_OBJECTIF');
      location.reload();
    });
  }

  // Create panel only if some URLs missing
  function shouldShow() {
    try {
      const cfg = window.CONFIG || {};
      return (!cfg.URL_BUDGET || !cfg.URL_PEA || !cfg.URL_CTO || !cfg.URL_EVOLUTION || !cfg.URL_OBJECTIF);
    } catch (e) { return true; }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (shouldShow()) createPanel();
  });
})();
