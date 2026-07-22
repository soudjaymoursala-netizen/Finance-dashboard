/* ================================================== */
/* SUIVI ANNUEL (optionnel, API_BUDGET_MENSUEL)       */
/* Extrait de chargerDashboard (googleSheets.js) pour  */
/* lisibilite - meme comportement, appele depuis la    */
/* fonction principale via chargerSuiviAnnuel().       */
/*                                                      */
/* Chaque ligne de la Sheet est regroupee par annee     */
/* (deduite du suffixe du label, ex: "Dec_25" -> 2025,  */
/* "Jan_26" -> 2026). Une annee avec une seule ligne     */
/* est traitee comme un resume annuel (chips            */
/* Revenus/Depenses/Epargne) plutot qu'un graphique a    */
/* une seule barre - c'est le cas typique d'une annee   */
/* pour laquelle seul un total global a ete saisi, sans */
/* detail mois par mois (ex: 2025 dans ce projet). Une  */
/* annee avec 2+ lignes devient un graphique Revenus vs */
/* Depenses. Ce decoupage reste valable automatiquement  */
/* les annees suivantes (janvier demarre en carte        */
/* resume a 1 ligne, bascule seule en graphique des que  */
/* fevrier arrive).                                      */
/* ================================================== */

async function chargerSuiviAnnuel() {
    try {
        const monthlySection = document.getElementById("monthlyBudgetSection");
        if (!window.CONFIG.URL_BUDGET_MENSUEL) return;

        let monthlyTxt = "";
        try {
            const r = await fetch(window.CONFIG.URL_BUDGET_MENSUEL);
            if (r.ok) monthlyTxt = await r.text();
        } catch (fetchErr) {
            // silencieux : feature optionnelle, pas encore configuree
        }
        if (!monthlyTxt) return;

        const sep = detectSeparator(monthlyTxt);
        const lines = monthlyTxt.replace(/\r/g, "").trim().split("\n");
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue;
            const cols = splitCsvLine(lines[i], sep);
            if (cols.length < 3) continue;
            const rev = nettoyerNombre(cols[1]);
            const dep = nettoyerNombre(cols[2]);
            if (rev === 0 && dep === 0) continue; // ligne future non renseignée
            rows.push({ label: cols[0].trim(), rev, dep });
        }

        // Regroupement par année (suffixe "_AA" a la fin du label,
        // ex: Dec_25 -> 25 -> 2025). Label sans suffixe reconnu ->
        // classe sous "?" plutot que de planter.
        const parAnnee = {};
        rows.forEach((row) => {
            const m = row.label.match(/_(\d{2})$/);
            const annee = m ? "20" + m[1] : "?";
            if (!parAnnee[annee]) parAnnee[annee] = [];
            parAnnee[annee].push(row);
        });

        const anneesTriees = Object.keys(parAnnee).sort();
        const container = document.getElementById("suiviAnnuelContainer");
        if (!anneesTriees.length || !container) return;

        container.innerHTML = "";

        anneesTriees.forEach((annee) => {
            const rowsAnnee = parAnnee[annee];
            const toggleId = "annee" + annee + "Toggle";
            const contentId = "annee" + annee + "Content";
            const chevronId = "annee" + annee + "Chevron";

            if (rowsAnnee.length < 2) {
                // Une seule ligne = résumé annuel (pas de détail mensuel disponible)
                const totalRev = rowsAnnee[0].rev;
                const totalDep = rowsAnnee[0].dep;
                const epargne = totalRev - totalDep;
                const card = document.createElement("div");
                card.className = "suivi-annee-card";
                card.innerHTML = `
                    <div class="toggle-card" id="${toggleId}" role="button" tabindex="0" aria-expanded="false" aria-controls="${contentId}">
                        <span class="icon-badge blue">📅</span>
                        <span class="toggle-card-label">${annee} — Résumé</span>
                        <span class="toggle-chevron" id="${chevronId}" style="position:static">▾</span>
                    </div>
                    <div class="chip-row collapsible-content" id="${contentId}">
                        <div class="chip">
                            <span class="chip-label"><span class="icon-badge emerald">💰</span>Revenus totaux</span>
                            <span class="chip-value">${formatEUR(totalRev)}</span>
                        </div>
                        <div class="chip">
                            <span class="chip-label"><span class="icon-badge gold">💸</span>Dépenses totales</span>
                            <span class="chip-value">${formatEUR(totalDep)}</span>
                        </div>
                        <div class="chip">
                            <span class="chip-label"><span class="icon-badge blue">🏦</span>Épargne</span>
                            <span class="chip-value">${formatEUR(epargne)}</span>
                        </div>
                    </div>
                `;
                container.appendChild(card);
                if (window.bindToggleSection) {
                    window.bindToggleSection(
                        document.getElementById(toggleId),
                        document.getElementById(contentId),
                        document.getElementById(chevronId),
                        null,
                        "suiviAnnuel"
                    );
                }
            } else {
                // 2+ lignes = vrai suivi mois par mois -> graphique
                const chartId = "suiviChart" + annee;
                const card = document.createElement("div");
                card.className = "suivi-annee-card";
                card.innerHTML = `
                    <div class="toggle-card" id="${toggleId}" role="button" tabindex="0" aria-expanded="false" aria-controls="${contentId}">
                        <span class="icon-badge emerald">📅</span>
                        <span class="toggle-card-label">${annee} — Suivi mensuel</span>
                        <span class="toggle-chevron" id="${chevronId}" style="position:static">▾</span>
                    </div>
                    <div class="collapsible-content" id="${contentId}">
                        <div class="card chart-card">
                            <div id="${chartId}" class="chart"></div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
                if (typeof updateMonthlyBudgetChart === "function") {
                    updateMonthlyBudgetChart(
                        rowsAnnee.map(r => r.label),
                        rowsAnnee.map(r => r.rev),
                        rowsAnnee.map(r => r.dep),
                        chartId
                    );
                }
                if (window.bindToggleSection) {
                    window.bindToggleSection(
                        document.getElementById(toggleId),
                        document.getElementById(contentId),
                        document.getElementById(chevronId),
                        function () { window.dispatchEvent(new Event("resize")); },
                        "suiviAnnuel"
                    );
                }
            }
        });

        if (monthlySection) monthlySection.style.display = "";
    } catch (e) {
        console.warn("Suivi annuel non disponible:", e);
    }
}
