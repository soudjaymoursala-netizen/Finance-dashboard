/**
 * Gestion centralisée des erreurs et affichage lisible dans l'UI (#alerts)
 */

function addAlert(message, type = "error") {
  try {
    const container = document.getElementById("alerts");
    if (!container) return;

    const div = document.createElement("div");
    div.className = `alert alert-${type}`;
    div.textContent = message;
    container.appendChild(div);

    // supprime automatiquement après 12s
    setTimeout(() => {
      if (div.parentNode === container) container.removeChild(div);
    }, 12000);
  } catch (e) {
    // ignore
  }
}

window.onerror = function (message, source, line, column, error) {
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

  addAlert(`Erreur JS: ${message} (${source}:${line})`, "error");
  return false;
};

window.addEventListener("unhandledrejection", function (event) {
  console.group("🚨 PROMISE REJETÉE");
  console.error("Reason :", event.reason);
  if (event.reason?.stack) {
    console.error("Stack :", event.reason.stack);
  }
  console.groupEnd();

  const reason = event.reason && event.reason.message ? event.reason.message : String(event.reason);
  addAlert(`Promise reject: ${reason}`, "error");
});

function showError(message) {
  console.error("Erreur Dashboard :", message);
  addAlert(message, "error");
}

function showSuccess(message) {
  console.log("Succès :", message);
  addAlert(message, "success");
}

function hideMessages() {
  try {
    const container = document.getElementById("alerts");
    if (!container) return;
    container.innerHTML = "";
  } catch (e) {}
}
