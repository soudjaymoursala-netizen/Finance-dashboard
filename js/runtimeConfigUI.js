/* UI for runtime configuration when URLs are missing */
(function () {
  function createPanel() {
    const existing = document.getElementById('runtime-config-panel');
    if (existing) return;

    const panel = document.createElement('div');
    panel.id = 'runtime-config-panel';
    panel.innerHTML = `
      <button id="runtime-config-toggle" aria-label="Config">⚙️</button>
      <div id="runtime-config" class="runtime-config-hidden">
        <h3>Config rapide (test)</h3>
        <p>Colle ici les URLs d'export CSV (ou laisse vide si tu utilises un Worker).</p>
        <label>URL_BUDGET<br><input id="rc-url-budget" type="text"/></label>
        <label>URL_CTO<br><input id="rc-url-cto" type="text"/></label>
        <label>URL_PEA<br><input id="rc-url-pea" type="text"/></label>
        <label>URL_EVOLUTION<br><input id="rc-url-evolution" type="text"/></label>
        <label>URL_OBJECTIF<br><input id="rc-url-objectif" type="text"/></label>
        <div style="margin-top:.5rem">
          <button id="rc-save">Save & Reload</button>
          <button id="rc-clear">Clear</button>
        </div>
        <small>Ces valeurs sont stockées localement dans ton navigateur (localStorage).</small>
      </div>
    `;

    document.body.appendChild(panel);

    const style = document.createElement('style');
    style.textContent = `
      #runtime-config-panel{position:fixed;right:12px;bottom:12px;z-index:9999;font-family:Arial,Helvetica,sans-serif}
      #runtime-config-toggle{background:#1f2937;color:white;border:none;border-radius:6px;padding:8px;cursor:pointer}
      #runtime-config{background:rgba(0,0,0,0.8);color:white;padding:12px;border-radius:8px;margin-top:8px;min-width:320px}
      #runtime-config label{display:block;margin:6px 0}
      #runtime-config input{width:100%;padding:6px;border-radius:4px;border:1px solid #333;background:#0f172a;color:#fff}
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
