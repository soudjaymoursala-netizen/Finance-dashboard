/* ================================================== */
/* FINANCE DASHBOARD V5 - googleSheets.js (patched)   */
/* Orchestration principale : recuperation des CSV,    */
/* calcul des KPI derives, mise a jour du DOM et des   */
/* graphiques. Le parsing/formatage (parsing.js), le   */
/* cache hors-ligne (dataCache.js) et le suivi annuel   */
/* (suiviAnnuel.js) ont ete extraits dans des fichiers  */
/* dedies pour la lisibilite.                          */
/* ================================================== */


/* ================================================== */
/* ANIMATION KPI                                      */
/* ================================================== */

function animerValeur(element, valeurFinale, suffixe = "") {
    if (!element) return;

    // Annule une animation precedente sur ce meme element si elle est
    // encore en cours (evite un chevauchement/flicker en cas de rappel
    // rapide sur le meme element).
    if (element._animFrame) cancelAnimationFrame(element._animFrame);

    const duree = 900;
    const debut = performance.now();

    // ease-out cubic : demarre vite, decelere en douceur vers la valeur
    // finale - beaucoup plus naturel qu'une progression lineaire.
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function step(maintenant) {
        const ecoule = maintenant - debut;
        const t = Math.min(ecoule / duree, 1);
        const valeur = valeurFinale * easeOutCubic(t);
        element.textContent = Math.round(valeur).toLocaleString("fr-FR") + suffixe;

        if (t < 1) {
            element._animFrame = requestAnimationFrame(step);
        } else {
            element._animFrame = null;
        }
    }

    element._animFrame = requestAnimationFrame(step);
}

/* ================================================== */
/* DOM                                                 */
/* ================================================== */
const DOM = {
    networth: document.getElementById("networth"),
    cash: document.getElementById("cashMain"),
    pea: document.getElementById("peaMain"),
    cto: document.getElementById("ctoMain"),
    investments: document.getElementById("investments"),
    heroCash: document.getElementById("heroCash"),
    performance: document.getElementById("performance"),
    totalGain: document.getElementById("totalGain"),
    globalPerformance: document.getElementById("globalPerformance"),
    capitalInvesti: document.getElementById("capitalInvesti"),
    valeurInvestie: document.getElementById("valeurInvestie"),
    fireProgress: document.getElementById("fireProgress"),
    fireDetails: document.getElementById("fireDetails"),
    fireBar: document.getElementById("fireBar"),
    mainGoalProgress: document.getElementById("mainGoalProgress"),
    lastUpdate: document.getElementById("lastUpdate"),
};

/* ================================================== */
/* DATA                                                */
/* ================================================== */
const DATA = {
    budget: {},
    pea: {},
    cto: {},
    patrimoine: 0,
    objectif250k: 250000,
    progression250k: 0,
    restant250k: 0,
    plusValueTotale: 0,
    capitalInvesti: 0,
    performanceGlobale: 0,
    valeurInvestie: 0,
    epargneAnnuelle: 0,
    anneesRestantes: 0,
    projectionAnnee: 0,
    ctoValeurEUR: 0,
    ctoInvestiEUR: 0,
    ctoPlusValueEUR: 0,
};

/* ================================================== */
/* CHARGEMENT DASHBOARD                               */
/* ================================================== */

async function chargerDashboard() {
    try {
        if (!window.CONFIG) throw new Error("window.CONFIG introuvable");

        // Fallback hors-ligne : si un fetch echoue (Worker down, reseau
        // coupe, etc.), fetchTextOrLog() (dataCache.js) retombe sur le
        // dernier CSV recupere avec succes pour cette source plutot que
        // de laisser un dashboard vide. On agrege ici les infos de
        // fraicheur retournees par chaque appel pour savoir s'il faut
        // afficher un bandeau d'avertissement.
        const [budgetRes, ctoRes, peaRes, evolutionRes, objectifRes] = await Promise.all([
            fetchTextOrLog(window.CONFIG.URL_BUDGET, "Budget"),
            fetchTextOrLog(window.CONFIG.URL_CTO, "CTO"),
            fetchTextOrLog(window.CONFIG.URL_PEA, "PEA"),
            fetchTextOrLog(window.CONFIG.URL_EVOLUTION, "Evolution"),
            fetchTextOrLog(window.CONFIG.URL_OBJECTIF, "Objectif"),
        ]);
        const budgetTxt = budgetRes.text, ctoTxt = ctoRes.text, peaTxt = peaRes.text,
            evolutionTxt = evolutionRes.text, objectifTxt = objectifRes.text;

        const resultatsFetch = [budgetRes, ctoRes, peaRes, evolutionRes, objectifRes];
        const perimes = resultatsFetch.filter(r => r.stale);
        if (perimes.length) {
            const datePlusAncienne = perimes.reduce((min, r) => (!min || r.cacheDate < min) ? r.cacheDate : min, null);
            const dateTxt = datePlusAncienne.toLocaleString("fr-FR");
            addAlert(`⚠️ Certaines données n'ont pas pu être rechargées (Worker ou réseau indisponible). Affichage des dernières données connues, datant du ${dateTxt}.`, "warning");
        }

        DATA.budget = lireCSVKPI(budgetTxt);
        DATA.cto = lireCSVKPI(ctoTxt);
        DATA.pea = lireCSVKPI(peaTxt);


        // Taux EUR/CHF : vient directement du Sheet CTO (colonne eur_chf),
        // qui utilise une formule GOOGLEFINANCE cote Sheet et se met donc
        // deja a jour automatiquement. Pas besoin d'un second appel API
        // cote client : un essai via api.frankfurter.app a ete tente ici
        // auparavant, mais il echoue systematiquement (CORS bloque depuis
        // GitHub Pages) et duplique une donnee deja live. Retire pour
        // eviter une erreur console a chaque chargement.
        const tauxChange = DATA.cto.eur_chf || 1;
        DATA.tauxChange = tauxChange;
        DATA.ctoValeurEUR = (DATA.cto.cto_valeur_chf || 0) * tauxChange;
        DATA.ctoInvestiEUR = (DATA.cto.cto_investi_chf || 0) * tauxChange;
        DATA.ctoPlusValueEUR = (DATA.cto.cto_plusvalue_chf || 0) * tauxChange;

        // Patrimoine = dernier point de API_Evolution (calculé côté Sheet,
        // source de référence unique). Mis à jour plus bas après parsing
        // de la série evolution ; initialisé à 0 en attendant.
        DATA.patrimoine = 0;
        DATA.progression250k = DATA.patrimoine > 0 ? (DATA.patrimoine / DATA.objectif250k) * 100 : 0;
        DATA.restant250k = Math.max(0, DATA.objectif250k - DATA.patrimoine);

        DATA.plusValueTotale = (DATA.pea.pea_plusvalue || 0) + DATA.ctoPlusValueEUR;
        DATA.capitalInvesti = (DATA.pea.pea_investi || 0) + DATA.ctoInvestiEUR;
        DATA.performanceGlobale = DATA.capitalInvesti > 0 ? (DATA.plusValueTotale / DATA.capitalInvesti) * 100 : 0;
        DATA.valeurInvestie = (DATA.pea.pea_valeur || 0) + (DATA.ctoValeurEUR || 0);

        // Épargne annuelle utilisée pour la projection FIRE : on utilise la
        // croissance réelle du patrimoine (patrimoine_annuel = cash épargné
        // + montant investi cette année) plutôt que revenus - dépenses, qui
        // ignore la performance des investissements et sous-estime le
        // rythme réel d'épargne. Cette mesure correspond à ce que
        // taux_epargne_annuel utilise déjà dans le Sheet lui-même.
        const revenusAnnuels = DATA.budget.revenus_annuel || 0;
        const depensesAnnuelles = DATA.budget.depenses_annuel || 0;
        DATA.epargneAnnuelle = DATA.budget.patrimoine_annuel > 0
            ? DATA.budget.patrimoine_annuel
            : Math.max(0, revenusAnnuels - depensesAnnuelles); // repli si patrimoine_annuel absent
        DATA.anneesRestantes = DATA.epargneAnnuelle > 0 ? DATA.restant250k / DATA.epargneAnnuelle : 0;
        DATA.projectionAnnee = new Date().getFullYear() + Math.ceil(DATA.anneesRestantes);

        // Update DOM values
        animerValeur(DOM.networth, DATA.patrimoine, " €");
        animerValeur(DOM.cash, DATA.budget.cash_dispo_total || 0, " €");
        if (typeof suivreMouvement === "function") suivreMouvement("cash", DATA.budget.cash_dispo_total, "€", "cashMouvements");
        animerValeur(DOM.investments, DATA.valeurInvestie || 0, " €"); // valeur actuelle : PEA + CTO converti au même taux
        animerValeur(DOM.heroCash, DATA.budget.cash_dispo_total || 0, " €");
        animerValeur(DOM.pea, DATA.pea.pea_valeur || 0, " €");
        animerValeur(DOM.cto, DATA.cto.cto_valeur_chf || 0, " CHF");
        const ctoFxNoteEl = document.getElementById("ctoFxNote");
        if (ctoFxNoteEl) {
            ctoFxNoteEl.classList.remove("skeleton");
            ctoFxNoteEl.textContent = "≈ " + formatEUR(DATA.ctoValeurEUR || 0);
        }
        if (DOM.performance) DOM.performance.textContent = ((DATA.budget.taux_epargne_annuel || 0) * 100).toFixed(0) + " %";

        // Variation jour PEA / CTO (clôture précédente vs valeur actuelle).
        // Nécessite les clés pea_valeur_hier / cto_valeur_chf_hier côté
        // Sheet (calculées avec GOOGLEFINANCE(ticker, "closeyest")). Si ces
        // clés n'existent pas encore, le badge reste simplement masqué.
        function afficherVarJour(elementId, valeurActuelle, valeurHier, deviseSuffixe) {
            const el = document.getElementById(elementId);
            if (!el || !valeurHier || valeurHier <= 0 || !valeurActuelle) return;
            const deltaPct = ((valeurActuelle - valeurHier) / valeurHier) * 100;
            const deltaAbs = valeurActuelle - valeurHier;
            if (Math.abs(deltaPct) < 0.01) {
                el.style.display = "none";
                return;
            }
            el.style.display = "";
            el.className = "account-trend " + (deltaPct >= 0 ? "up" : "down");
            const signe = deltaPct >= 0 ? "+" : "";
            el.textContent = (deltaPct >= 0 ? "▲ " : "▼ ") + signe + deltaPct.toFixed(2) + "% (" + signe + Math.round(deltaAbs).toLocaleString("fr-FR") + " " + deviseSuffixe + ") aujourd'hui";
            el.title = "Variation depuis la clôture précédente";
        }
        try {
            afficherVarJour("peaVarJour", DATA.pea.pea_valeur, DATA.pea.pea_valeur_hier, "€");
            afficherVarJour("ctoVarJour", DATA.cto.cto_valeur_chf, DATA.cto.cto_valeur_chf_hier, "CHF");
        } catch (e) {
            console.warn("Variation jour non calculable:", e);
        }
        try {
            if (typeof suivreMouvement === "function") {
                suivreMouvement("pea", DATA.pea.pea_valeur, "€", "peaMouvements");
                suivreMouvement("cto", DATA.cto.cto_valeur_chf, "CHF", "ctoMouvements");
            }
        } catch (e) {
            console.warn("Suivi des mouvements non calculable:", e);
        }

        // Sous-cartes de detail Cash / PEA / CTO (reveleés au clic sur
        // le chip correspondant). Ecriture defensive (|| 0) : les 4
        // champs epargne_livret_* ne sont pas encore forcement presents
        // dans API_BUDGET tant que l'utilisateur ne les a pas ajoutes -
        // dans ce cas la sous-carte affiche simplement 0 € sans erreur.
        const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

        setTxt("cashLivretA", formatEUR(DATA.budget.epargne_livret_A || 0));
        setTxt("cashLdds", formatEUR(DATA.budget.epargne_livret_ldds || 0));
        setTxt("cashNickel", formatEUR(DATA.budget.epargne_nickel || 0));
        setTxt("cashYuh", formatEUR(DATA.budget.epargne_livret_yuh || 0));

        setTxt("peaDetailValeur", formatEUR(DATA.pea.pea_valeur || 0));
        setTxt("peaDetailInvesti", formatEUR(DATA.pea.pea_investi || 0));
        setTxt("peaDetailPlusvalue", formatEUR(DATA.pea.pea_plusvalue || 0));
        setTxt("peaDetailPerformance", formatPourcentage((DATA.pea.pea_performance || 0) * 100));
        setTxt("peaDetailAction", formatEUR(DATA.pea.pea_action || 0));
        setTxt("peaDetailEtf", formatEUR(DATA.pea.pea_etf || 0));
        setTxt("peaDetailPartAction", formatPourcentage((DATA.pea.part_action || 0) * 100));
        setTxt("peaDetailPartEtf", formatPourcentage((DATA.pea.part_etf || 0) * 100));
        setTxt("peaDetailPositions", Math.round(DATA.pea.nombre_position || 0).toString());

        setTxt("ctoDetailInvesti", formatCHF(DATA.cto.cto_investi_chf || 0));
        setTxt("ctoDetailPlusvalue", formatCHF(DATA.cto.cto_plusvalue_chf || 0));
        setTxt("ctoDetailPerformance", formatPourcentage((DATA.cto.cto_performance || 0) * 100));
        setTxt("ctoDetailAction", formatCHF(DATA.cto.cto_action || 0));
        setTxt("ctoDetailEtf", formatCHF(DATA.cto.cto_etf || 0));
        setTxt("ctoDetailCrypto", formatCHF(DATA.cto.cto_crypto || 0));
        setTxt("ctoDetailPartAction", formatPourcentage((DATA.cto.part_action || 0) * 100));
        setTxt("ctoDetailPartEtf", formatPourcentage((DATA.cto.part_etf || 0) * 100));
        setTxt("ctoDetailPartCrypto", formatPourcentage((DATA.cto.part_crypto || 0) * 100));
        setTxt("ctoDetailPositions", Math.round(DATA.cto.nombre_position || 0).toString());


        if (DOM.totalGain) DOM.totalGain.textContent = formatEUR(DATA.plusValueTotale);
        if (DOM.globalPerformance) DOM.globalPerformance.textContent = formatPourcentage(DATA.performanceGlobale);
        if (DOM.capitalInvesti) DOM.capitalInvesti.textContent = formatEUR(DATA.capitalInvesti);
        if (DOM.valeurInvestie) DOM.valeurInvestie.textContent = formatEUR(DATA.valeurInvestie);

        if (DOM.fireProgress) DOM.fireProgress.textContent = DATA.progression250k.toFixed(1) + " %";
        if (DOM.mainGoalProgress) DOM.mainGoalProgress.textContent = "🎯 " + DATA.progression250k.toFixed(1) + "% vers " + Math.round(DATA.objectif250k / 1000) + "k";
        if (DOM.fireDetails) DOM.fireDetails.innerHTML =
                    '<div class="fire-stat"><span class="fire-stat-label">💸 Reste à atteindre</span><span class="fire-stat-value">' + formatEUR(DATA.restant250k) + '</span></div>' +
                    '<div class="fire-stat"><span class="fire-stat-label">🏦 Épargne annuelle</span><span class="fire-stat-value">' + formatEUR(DATA.epargneAnnuelle) + '</span></div>' +
                    '<div class="fire-stat"><span class="fire-stat-label">🚀 Horizon</span><span class="fire-stat-value">' + DATA.projectionAnnee + ' (~' + DATA.anneesRestantes.toFixed(1) + ' ans)</span></div>';
        if (DOM.fireBar) {
            const pct = Math.max(0, Math.min(DATA.progression250k, 100));
            DOM.fireBar.style.width = pct + "%";
            const fireProgressWrapper = DOM.fireBar.parentElement;
            if (fireProgressWrapper) fireProgressWrapper.setAttribute("aria-valuenow", Math.round(pct));
        }
        if (DOM.lastUpdate) DOM.lastUpdate.textContent = "Dernière synchronisation : " + new Date().toLocaleString("fr-FR");


        // Allocation chart
        if (typeof updateAllocationChart === "function") {
            updateAllocationChart(DATA.budget.cash_dispo_total || 0, DATA.pea.pea_valeur || 0, DATA.ctoValeurEUR || 0, DATA.patrimoine || 0);
        }

        // Evolution chart parsing (robust)
        try {
            const sample = evolutionTxt || "";
            const sep = detectSeparator(sample);
            const lines = (evolutionTxt || "").replace(/\r/g, "").trim().split("\n");
            const labelsRaw = [];
            const valeursRaw = [];
            const peaRaw = [];
            const ctoRaw = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i]) continue;
                const cols = splitCsvLine(lines[i], sep);
                if (cols.length < 2) continue;
                labelsRaw.push(cols[0].trim());
                valeursRaw.push(nettoyerNombre(cols[1].trim().replace(/^\"|\"$/g, "")));
                // Colonnes optionnelles : historique PEA (col 3) et CTO en CHF
                // (col 4). Si absentes du Sheet, les sparklines correspondants
                // restent simplement masqués (voir updateAccountSparkline).
                peaRaw.push(cols.length > 2 ? nettoyerNombre(cols[2].trim().replace(/^\"|\"$/g, "")) : null);
                ctoRaw.push(cols.length > 3 ? nettoyerNombre(cols[3].trim().replace(/^\"|\"$/g, "")) : null);
            }

            // Certains Sheets reportent automatiquement la derniere valeur
            // connue sur les mois futurs non-encore-atteints (formule de
            // report). Ca cree un plateau artificiel en fin de courbe qui
            // donne l'impression que le patrimoine a arrete de croitre.
            // On coupe la queue de valeurs strictement identiques et
            // consecutives en fin de serie (on garde le premier point de
            // ce plateau, qui correspond au dernier mois reellement suivi).
            let coupureIndex = valeursRaw.length;
            if (valeursRaw.length > 2) {
                const derniereValeur = valeursRaw[valeursRaw.length - 1];
                let j = valeursRaw.length - 1;
                while (j > 0 && valeursRaw[j - 1] === derniereValeur) j--;
                // j pointe maintenant sur le premier point du plateau final
                if (valeursRaw.length - j >= 2) coupureIndex = j + 1;
            }
            const labels = labelsRaw.slice(0, coupureIndex);
            const valeurs = valeursRaw.slice(0, coupureIndex);
            const peaSeries = peaRaw.slice(0, coupureIndex).filter((v) => v !== null);
            const ctoSeries = ctoRaw.slice(0, coupureIndex).filter((v) => v !== null);

            // Dernière valeur connue = patrimoine réel du Sheet API_Evolution
            const dernierPatrimoine = valeurs.length > 0 ? valeurs[valeurs.length - 1] : 0;
            if (dernierPatrimoine > 0) {
                DATA.patrimoine = dernierPatrimoine;
                // Re-synchroniser tous les affichages qui dépendent du patrimoine
                animerValeur(DOM.networth, DATA.patrimoine, " €");
                DATA.progression250k = (DATA.patrimoine / DATA.objectif250k) * 100;
                DATA.restant250k = Math.max(0, DATA.objectif250k - DATA.patrimoine);
                DATA.anneesRestantes = DATA.epargneAnnuelle > 0 ? DATA.restant250k / DATA.epargneAnnuelle : 0;
                DATA.projectionAnnee = new Date().getFullYear() + Math.ceil(DATA.anneesRestantes);
                if (DOM.fireProgress) DOM.fireProgress.textContent = DATA.progression250k.toFixed(1) + " %";
                if (DOM.mainGoalProgress) DOM.mainGoalProgress.textContent = "🎯 " + DATA.progression250k.toFixed(1) + "% vers " + Math.round(DATA.objectif250k / 1000) + "k";
                // Mettre à jour le donut avec le patrimoine corrigé
                if (typeof updateAllocationChart === "function") {
                    updateAllocationChart(DATA.budget.cash_dispo_total || 0, DATA.pea.pea_valeur || 0, DATA.ctoValeurEUR || 0, DATA.patrimoine);
                }
            }
            if (typeof updatePatrimoineChart === "function") updatePatrimoineChart(labels, valeurs, DATA.objectif250k);
            if (typeof updateHeroSparkline === "function") updateHeroSparkline(valeurs);
            if (typeof updatePeaSparkline === "function") updatePeaSparkline(peaSeries);
            if (typeof updateCtoSparkline === "function") updateCtoSparkline(ctoSeries);

            // Badge de tendance : variation entre les 2 derniers points connus
            // (indicateur unique et bien visible, avec % ET montant en €).
            // On affiche la vraie date du point de comparaison plutôt que
            // "ce mois" en dur, car les points du Sheet ne sont pas toujours
            // espacés d'exactement un mois.
            try {
                const pointsValides = [];
                for (let k = 0; k < valeurs.length; k++) {
                    if (valeurs[k] && valeurs[k] > 0) pointsValides.push({ valeur: valeurs[k], label: labels[k] });
                }
                if (pointsValides.length >= 2) {
                    const dernier = pointsValides[pointsValides.length - 1].valeur;
                    const precedentPoint = pointsValides[pointsValides.length - 2];
                    const precedent = precedentPoint.valeur;
                    const deltaPct = precedent > 0 ? ((dernier - precedent) / precedent) * 100 : 0;
                    const deltaAbs = dernier - precedent;
                    const trendEl = document.getElementById("heroTrend");
                    if (trendEl && Math.abs(deltaPct) > 0.05) {
                        trendEl.style.display = "";
                        trendEl.className = "hero-trend " + (deltaPct >= 0 ? "up" : "down");
                        const signe = deltaPct >= 0 ? "+" : "";
                        trendEl.textContent = (deltaPct >= 0 ? "▲ " : "▼ ") + signe + deltaPct.toFixed(1) + "% (" + signe + formatEUR(deltaAbs) + ") depuis " + precedentPoint.label;
                        trendEl.title = "Variation par rapport au point précédent du suivi (" + precedentPoint.label + ")";
                    }
                }
            } catch (e) {
                console.warn("Tendance héros non calculable:", e);
            }
        } catch (e) {
            console.warn("Erreur parsing evolution chart:", e);
        }

        // Objectifs parsing (robust + dynamique)
        // API_OBJECTIF contient 2 familles de lignes :
        //  - objectifs d'épargne (appartement, voiture, vacances, fonds_urgence, patrimoine_total)
        //    -> déjà affichés via des barres dédiées (id="goal-xxx" / "bar-xxx")
        //  - métriques annuelles (revenue_annuel, depense_annuel, epargne_annuel, investis_annuel)
        //    -> affichées dynamiquement dans la nouvelle section "Objectifs Annuels"
        const OBJECTIFS = {};
        try {
            const sample = objectifTxt || "";
            const sep = detectSeparator(sample);
            const lines = (objectifTxt || "").replace(/\r/g, "").trim().split("\n");
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i]) continue;
                const cols = splitCsvLine(lines[i], sep);
                if (cols.length < 3) continue;
                const nom = cols[0].trim().replace(/^\"|\"$/g, "");
                const cible = nettoyerNombre(cols[1].trim().replace(/^\"|\"$/g, ""));
                const actuel = nettoyerNombre(cols[2].trim().replace(/^\"|\"$/g, ""));
                if (!nom) continue;
                OBJECTIFS[nom] = { cible, actuel };
            }

            // Objectif patrimoine 250k : piloté dynamiquement par le Sheet
            // (au lieu d'une valeur figée dans le code)
            if (OBJECTIFS.patrimoine_total && OBJECTIFS.patrimoine_total.cible > 0) {
                DATA.objectif250k = OBJECTIFS.patrimoine_total.cible;
                DATA.restant250k = Math.max(0, DATA.objectif250k - DATA.patrimoine);
                DATA.progression250k = DATA.patrimoine > 0 ? (DATA.patrimoine / DATA.objectif250k) * 100 : 0;
                DATA.anneesRestantes = DATA.epargneAnnuelle > 0 ? DATA.restant250k / DATA.epargneAnnuelle : 0;
                DATA.projectionAnnee = new Date().getFullYear() + Math.ceil(DATA.anneesRestantes);
                // re-synchroniser l'affichage deja fait plus haut avec la cible dynamique
                if (DOM.fireProgress) DOM.fireProgress.textContent = DATA.progression250k.toFixed(1) + " %";
                if (DOM.mainGoalProgress) DOM.mainGoalProgress.textContent = "🎯 " + DATA.progression250k.toFixed(1) + "% vers " + Math.round(DATA.objectif250k / 1000) + "k";
                if (DOM.fireDetails) DOM.fireDetails.innerHTML =
                    '<div class="fire-stat"><span class="fire-stat-label">💸 Reste à atteindre</span><span class="fire-stat-value">' + formatEUR(DATA.restant250k) + '</span></div>' +
                    '<div class="fire-stat"><span class="fire-stat-label">🏦 Épargne annuelle</span><span class="fire-stat-value">' + formatEUR(DATA.epargneAnnuelle) + '</span></div>' +
                    '<div class="fire-stat"><span class="fire-stat-label">🚀 Horizon</span><span class="fire-stat-value">' + DATA.projectionAnnee + ' (~' + DATA.anneesRestantes.toFixed(1) + ' ans)</span></div>';
                if (DOM.fireBar) {
            const pct = Math.max(0, Math.min(DATA.progression250k, 100));
            DOM.fireBar.style.width = pct + "%";
            const fireProgressWrapper = DOM.fireBar.parentElement;
            if (fireProgressWrapper) fireProgressWrapper.setAttribute("aria-valuenow", Math.round(pct));
        }
                // redessine le graphique patrimoine avec la cible reelle (il avait ete
                // dessine plus haut avec la valeur par defaut, avant que l'objectif
                // dynamique ne soit connu)
                if (typeof updatePatrimoineChart === "function") {
                    updatePatrimoineChart(lastPatrimoine.labels, lastPatrimoine.valeurs, DATA.objectif250k);
                }
            }

            // Barres des objectifs d'épargne (comportement existant, conservé)
            ["appartement", "voiture", "vacances", "fonds_urgence", "patrimoine_total"].forEach((objectif) => {
                const o = OBJECTIFS[objectif];
                if (!o || o.cible <= 0) return;
                const pourcentage = Math.max(0, (o.actuel / o.cible) * 100);
                const label = document.getElementById("goal-" + objectif);
                const barre = document.getElementById("bar-" + objectif);
                if (label) label.textContent = `${Math.round(o.actuel).toLocaleString("fr-FR")} € / ${Math.round(o.cible).toLocaleString("fr-FR")} € (${pourcentage.toFixed(1)}%)`;
                if (barre) {
                    barre.style.width = `${Math.min(pourcentage, 100)}%`;
                    let couleurBarre;
                    if (pourcentage < 25) couleurBarre = getStatusColor("negative");
                    else if (pourcentage < 50) couleurBarre = getStatusColor("warning");
                    else if (pourcentage < 75) couleurBarre = getStatusColor("info");
                    else couleurBarre = getStatusColor("positive");
                    barre.style.background = couleurBarre;
                    const parentCard = barre.closest(".goal-card");
                    if (parentCard) parentCard.style.borderLeftColor = couleurBarre;
                    const progressWrapper = barre.closest(".progress-bar");
                    if (progressWrapper) progressWrapper.setAttribute("aria-valuenow", Math.round(Math.min(pourcentage, 100)));
                }
            });

            // Métriques annuelles (nouveau) : rendu dynamique dans #objectifsAnnuelsContainer
            const ANNUELS = [
                { key: "revenue_annuel", label: "💰 Revenus", lowerIsBetter: false },
                { key: "depense_annuel", label: "💸 Dépenses", lowerIsBetter: true },
                { key: "epargne_annuel", label: "🏦 Épargne", lowerIsBetter: false },
                { key: "investis_annuel", label: "📈 Investissements", lowerIsBetter: false },
            ];
            const container = document.getElementById("objectifsAnnuelsContainer");
            if (container) {
                container.innerHTML = "";
                ANNUELS.forEach(({ key, label, lowerIsBetter }) => {
                    const o = OBJECTIFS[key];
                    if (!o || o.cible <= 0) return;
                    const pourcentage = Math.max(0, (o.actuel / o.cible) * 100);
                    // "en bonne voie" : pour les dépenses, être sous la cible est positif ;
                    // pour le reste, être proche/au-dessus de la cible est positif.
                    const enBonneVoie = lowerIsBetter ? o.actuel <= o.cible : pourcentage >= 75;
                    const surCible = lowerIsBetter ? o.actuel > o.cible : false;
                    let couleur = getStatusColor("info");
                    if (surCible) couleur = getStatusColor("negative");
                    else if (enBonneVoie) couleur = getStatusColor("positive");
                    else if (pourcentage < 50 && !lowerIsBetter) couleur = getStatusColor("warning");

                    const card = document.createElement("div");
                    card.className = "objectif-annuel-card";
                    card.style.borderLeftColor = couleur;
                    card.innerHTML = `
                        <div class="goal-header">
                            <span>${label}</span>
                            <span style="color:${couleur}">${Math.round(o.actuel).toLocaleString("fr-FR")} € / ${Math.round(o.cible).toLocaleString("fr-FR")} €</span>
                        </div>
                        <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(pourcentage, 100))}" aria-label="${label}">
                            <div class="progress-fill" style="width:${Math.min(pourcentage, 100)}%;background:${couleur}"></div>
                        </div>
                        <div class="objectif-annuel-pct" style="color:${couleur}">${pourcentage.toFixed(0)}%${lowerIsBetter ? (surCible ? " — dépassement" : " du budget utilisé") : " atteint"}</div>
                    `;
                    container.appendChild(card);
                });
            }

        } catch (e) {
            console.warn("Erreur parsing objectifs:", e);
        }

        // Composition du portefeuille (nouveau) : PEA (Actions/ETF) + CTO (Actions/ETF/Crypto)
        // Ces données étaient déjà récupérées (DATA.pea / DATA.cto) mais jamais affichées.
        try {
            if (typeof updatePeaCompositionChart === "function") {
                updatePeaCompositionChart(DATA.pea.pea_action || 0, DATA.pea.pea_etf || 0);
            }
            if (typeof updateCtoCompositionChart === "function") {
                updateCtoCompositionChart(DATA.cto.cto_action || 0, DATA.cto.cto_etf || 0, DATA.cto.cto_crypto || 0);
            }
            // Nombre de positions desormais couvert par les sous-cartes
            // "Positions" (peaDetailPositions / ctoDetailPositions),
            // donc plus besoin de ce texte separe redondant. Le taux
            // EUR/CHF (info non dupliquee ailleurs) devient sa propre
            // sous-carte dans le detail CTO.
            // Afficher le taux EUR/CHF (source : formule GOOGLEFINANCE du Sheet CTO)
            // On réinverse pour afficher EUR→CHF (convention lisible)
            const tauxEurChfAffichage = DATA.tauxChange > 0 ? (1 / DATA.tauxChange) : (DATA.cto.eur_chf || 0);
            setTxt("ctoDetailEurChf", "1 € = " + tauxEurChfAffichage.toFixed(4) + " CHF");
        } catch (e) {
            console.warn("Erreur composition portefeuille:", e);
        }

        // Suivi annuel (optionnel, cf. suiviAnnuel.js pour le detail :
        // resume si un seul point de donnee pour l'annee, graphique
        // mensuel si 2+ mois disponibles).
        if (typeof chargerSuiviAnnuel === "function") {
            await chargerSuiviAnnuel();
        }
        // theme handling unchanged
        const themeButton = document.getElementById("themeToggle");
        if (themeButton) {
            if (localStorage.getItem("theme") === "light") {
                document.body.classList.add("light");
                themeButton.textContent = "☀️";
                if (window.refreshCharts) window.refreshCharts();
            }
            themeButton.addEventListener("click", () => {
                document.body.classList.toggle("light");
                const isLight = document.body.classList.contains("light");
                themeButton.textContent = isLight ? "☀️" : "🌙";
                localStorage.setItem("theme", isLight ? "light" : "dark");
                if (window.refreshCharts) window.refreshCharts();
            });
        }

        // Chargement termine : on retire la pulsation de tous les
        // placeholders restants (au cas ou une donnee precise n'aurait
        // pas ete ecrite individuellement plus haut).
        document.querySelectorAll(".skeleton").forEach((el) => el.classList.remove("skeleton"));

    } catch (error) {
        console.error("Erreur Dashboard :", error);
        showError("Erreur lors du chargement du dashboard. Voir la console pour plus d'infos.");
    }
}

/* ================================================== */
/* INITIALISATION                                     */
/* ================================================== */

document.addEventListener("DOMContentLoaded", chargerDashboard);

// Rafraichissement manuel (bouton 🔄 du header) : relance simplement
// chargerDashboard(), qui refait ses fetch (network-first) et met a
// jour tout le DOM/graphiques normalement. Desactive le bouton et fait
// tourner l'icone pendant le chargement pour eviter les doubles-clics
// et donner un retour visuel clair.
document.addEventListener("DOMContentLoaded", function () {
    const refreshBtn = document.getElementById("refreshBtn");
    if (!refreshBtn) return;
    refreshBtn.addEventListener("click", async function () {
        if (refreshBtn.disabled) return;
        refreshBtn.disabled = true;
        refreshBtn.classList.add("spinning");
        try {
            await chargerDashboard();
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.classList.remove("spinning");
        }
    });
});
