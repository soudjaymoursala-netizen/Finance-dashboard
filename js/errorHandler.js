/**
 * Gestion centralisée des erreurs
 */

window.onerror = function (
    message,
    source,
    line,
    column,
    error
) {

    console.group("🚨 ERREUR JAVASCRIPT");

    console.error("Message :", message);
    console.error("Source  :", source);
    console.error("Ligne   :", line);
    console.error("Colonne :", column);

    if (error) {
        console.error("Objet erreur :", error);
        console.error("Stack :", error.stack);
    }

    console.groupEnd();

    // Afficher une alerte visible
    try {
        showAlert("Une erreur JavaScript est survenue — consultez la console pour plus de détails.", "error");
    } catch (e) {
        // ignore
    }

    return false;
};

window.addEventListener("unhandledrejection", function (event) {

    console.group("🚨 PROMISE REJETÉE");

    console.error("Reason :", event.reason);

    if (event.reason?.stack) {
        console.error("Stack :", event.reason.stack);
    }

    console.groupEnd();

    try {
        showAlert("Une promesse a été rejetée — consultez la console pour plus de détails.", "error");
    } catch (e) {
        // ignore
    }

});

function showError(message) {

    console.error(
        "Erreur Dashboard :",
        message
    );

    try {
        showAlert(String(message), "error");
    } catch (e) {
        // ignore
    }

}

function showSuccess(message) {

    console.log(
        "Succès :",
        message
    );

    try {
        showAlert(String(message), "success", 4000);
    } catch (e) {
        // ignore
    }

}

function hideMessages() {
    const container = document.getElementById("alerts");
    if (container) container.innerHTML = "";
}

/**
 * showAlert(message, type = 'info'|'error'|'success'|'warning', timeoutMs = 6000)
 * Inserts a dismissible alert box inside #alerts
 */
function showAlert(message, type = "info", timeoutMs = 6000) {
    const container = document.getElementById("alerts");
    if (!container) return;

    const wrap = document.createElement("div");
    wrap.className = `alert alert-${type}`;
    wrap.setAttribute("role", "alert");
    wrap.innerHTML = `
        <div class="alert-content">${message}</div>
        <button class="alert-close" aria-label="close">×</button>
    `;

    container.appendChild(wrap);

    const closeBtn = wrap.querySelector(".alert-close");
    closeBtn.addEventListener("click", () => {
        wrap.remove();
    });

    if (timeoutMs > 0) {
        setTimeout(() => {
            wrap.remove();
        }, timeoutMs);
    }
}
