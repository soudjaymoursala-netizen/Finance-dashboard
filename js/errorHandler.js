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

    return false;
};

window.addEventListener("unhandledrejection", function (event) {

    console.group("🚨 PROMISE REJETÉE");

    console.error("Reason :", event.reason);

    if (event.reason?.stack) {
        console.error("Stack :", event.reason.stack);
    }

    console.groupEnd();

});

function showError(message) {

    console.error(
        "Erreur Dashboard :",
        message
    );

}

function showSuccess(message) {

    console.log(
        "Succès :",
        message
    );

}

function hideMessages() {

}
