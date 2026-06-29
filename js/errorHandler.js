/**
 * Gestion centralisée des erreurs et affichage utilisateur
 */

const ERROR_CONTAINER_ID = 'error-container';
const ERROR_MESSAGE_ID = 'error-message';

/**
 * Initialise le conteneur d'erreurs dans le DOM
 */
export function initErrorContainer() {
    if (!document.getElementById(ERROR_CONTAINER_ID)) {
        const container = document.createElement('div');
        container.id = ERROR_CONTAINER_ID;
        container.style.cssText = `
            display: none;
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            max-width: 400px;
            font-size: 14px;
            line-height: 1.5;
        `;
        
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
                <div>
                    <strong>⚠️ Erreur</strong>
                    <p id="${ERROR_MESSAGE_ID}" style="margin: 5px 0 0 0;"></p>
                </div>
                <button onclick="this.parentElement.parentElement.style.display='none'" 
                        style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0;">
                    ✕
                </button>
            </div>
        `;
        
        document.body.appendChild(container);
    }
}

/**
 * Affiche un message d'erreur à l'utilisateur
 * @param {string} message - Le message d'erreur à afficher
 * @param {number} duration - Durée d'affichage en ms (0 = pas auto-hide)
 */
export function showError(message, duration = 5000) {
    initErrorContainer();
    
    const container = document.getElementById(ERROR_CONTAINER_ID);
    const messageEl = document.getElementById(ERROR_MESSAGE_ID);
    
    messageEl.textContent = message;
    container.style.display = 'block';
    
    console.error('❌ Erreur Dashboard:', message);
    
    if (duration > 0) {
        setTimeout(() => {
            container.style.display = 'none';
        }, duration);
    }
}

/**
 * Affiche un message de chargement
 * @param {string} message - Le message à afficher
 */
export function showLoading(message = 'Chargement des données...') {
    initErrorContainer();
    
    const container = document.getElementById(ERROR_CONTAINER_ID);
    container.style.background = '#0066cc';
    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
            <span>${message}</span>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    container.style.display = 'block';
}

/**
 * Affiche un message de succès
 * @param {string} message - Le message de succès
 */
export function showSuccess(message, duration = 3000) {
    initErrorContainer();
    
    const container = document.getElementById(ERROR_CONTAINER_ID);
    container.style.background = '#16a34a';
    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>✓ ${message}</span>
            <button onclick="this.parentElement.parentElement.style.display='none'" 
                    style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; padding: 0; margin-left: auto;">
                ✕
            </button>
        </div>
    `;
    container.style.display = 'block';
    
    if (duration > 0) {
        setTimeout(() => {
            container.style.display = 'none';
        }, duration);
    }
}

/**
 * Masque tous les messages
 */
export function hideMessages() {
    const container = document.getElementById(ERROR_CONTAINER_ID);
    if (container) {
        container.style.display = 'none';
    }
}
