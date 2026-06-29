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

    console.error(
        "Erreur JS :",
        {
            message,
            source,
            line,
            column,
            error
        }
    );

};

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
