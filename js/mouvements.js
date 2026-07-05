/* Suivi des mouvements par compte (Cash / PEA / CTO), affiché directement
   sur la carte. Fonctionne en local (localStorage) : à CHAQUE chargement,
   on compare la valeur actuelle à la dernière valeur vérifiée du compte,
   qu'il y ait eu un changement ou non — c'est le point clé qui évite 2 bugs :
     1) le badge qui reste bloqué sur un ancien mouvement même quand la
        valeur s'est stabilisée depuis (la "dernière valeur vérifiée" n'était
        mise à jour qu'en cas de changement) ;
     2) l'absence totale de badge sur un compte qui ne bouge jamais (il ne
        pouvait jamais atteindre 2 points enregistrés).
   Une seule ligne de statut est affichée : soit le dernier changement
   détecté, soit "= stable" avec l'heure de la dernière vérification.
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

    const STORAGE_KEY = "financeDashboard_lastCheck_" + compteKey;
    const SEUIL = 0.5; // en unité de la devise, pour ignorer le bruit d'arrondi
    const maintenant = new Date().toISOString();

    let etat = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) etat = JSON.parse(raw);
    } catch (e) {
        etat = null;
    }

    if (!etat || etat.valeur === undefined) {
        // Première vérification jamais faite pour ce compte : rien à
        // afficher encore (pas de point de comparaison), mais on enregistre
        // ce premier point pour pouvoir comparer au prochain chargement.
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ valeur: valeurActuelle, date: maintenant }));
        } catch (e) {
            console.warn("Impossible d'enregistrer l'état initial:", e);
        }
        container.innerHTML = "";
        return;
    }

    const delta = valeurActuelle - etat.valeur;
    const aChange = Math.abs(delta) >= SEUIL;

    // On met à jour l'état vérifié à CHAQUE chargement (changement ou pas)
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ valeur: valeurActuelle, date: maintenant }));
    } catch (e) {
        console.warn("Impossible d'enregistrer l'état:", e);
    }

    if (aChange) {
        const cls = delta >= 0 ? "up" : "down";
        const signe = delta >= 0 ? "+" : "";
        container.innerHTML = '<div class="mouvement-ligne">' +
            '<span class="mouvement-date">' + formatMouvementDate(maintenant) + "</span>" +
            '<span class="mouvement-delta ' + cls + '">' + (delta >= 0 ? "▲ " : "▼ ") +
            signe + Math.round(delta).toLocaleString("fr-FR") + " " + deviseSuffixe + "</span>" +
            "</div>";
    } else {
        container.innerHTML = '<div class="mouvement-ligne">' +
            '<span class="mouvement-date">' + formatMouvementDate(maintenant) + "</span>" +
            '<span class="mouvement-delta flat">= stable</span>' +
            "</div>";
    }
}
