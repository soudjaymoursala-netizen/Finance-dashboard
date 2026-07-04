/* Suivi des mouvements par compte (Cash / PEA / CTO), affiché directement
   sur la carte. Fonctionne en local (localStorage) : à chaque chargement,
   on compare la valeur actuelle à la dernière valeur connue du compte ; si
   elle a changé, on enregistre un nouveau point. La liste affichée montre
   les derniers changements détectés (delta entre 2 synchros), du plus
   récent au plus ancien.
   Limite : pas d'historique rétroactif, et un "mouvement" = un changement
   de valeur détecté entre deux ouvertures du dashboard, pas un mouvement
   bancaire individuel. */

function formatMouvementDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) +
        " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function suivreMouvement(compteKey, valeurActuelle, deviseSuffixe, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !valeurActuelle || valeurActuelle <= 0) return;

    const STORAGE_KEY = "financeDashboard_mouvements_" + compteKey;
    const MAX_ENTRIES = 6;
    const MAX_LIGNES_AFFICHEES = 4;
    const SEUIL = 0.5; // en unité de la devise, pour ignorer le bruit d'arrondi

    let historique = [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) historique = JSON.parse(raw) || [];
    } catch (e) {
        historique = [];
    }

    const dernier = historique.length ? historique[historique.length - 1] : null;
    if (!dernier || Math.abs(dernier.valeur - valeurActuelle) > SEUIL) {
        historique.push({ date: new Date().toISOString(), valeur: valeurActuelle });
        if (historique.length > MAX_ENTRIES) {
            historique = historique.slice(historique.length - MAX_ENTRIES);
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
        } catch (e) {
            console.warn("Impossible d'enregistrer le mouvement:", e);
        }
    }

    if (historique.length < 2) {
        container.innerHTML = "";
        return;
    }

    let html = "";
    let lignesAffichees = 0;
    for (let i = historique.length - 1; i >= 1 && lignesAffichees < MAX_LIGNES_AFFICHEES; i--) {
        const actuel = historique[i];
        const precedent = historique[i - 1];
        const delta = actuel.valeur - precedent.valeur;
        if (Math.abs(delta) < SEUIL) continue;
        const cls = delta >= 0 ? "up" : "down";
        const signe = delta >= 0 ? "+" : "";
        html += '<div class="mouvement-ligne">' +
            '<span class="mouvement-date">' + formatMouvementDate(actuel.date) + "</span>" +
            '<span class="mouvement-delta ' + cls + '">' + (delta >= 0 ? "▲ " : "▼ ") +
            signe + Math.round(delta).toLocaleString("fr-FR") + " " + deviseSuffixe + "</span>" +
            "</div>";
        lignesAffichees++;
    }
    if (lignesAffichees === 0) {
        const dernierPoint = historique[historique.length - 1];
        html = '<div class="mouvement-ligne">' +
            '<span class="mouvement-date">' + formatMouvementDate(dernierPoint.date) + "</span>" +
            '<span class="mouvement-delta flat">= stable</span>' +
            "</div>";
    }
    container.innerHTML = html;
}
