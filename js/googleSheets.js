const lignesObjectifs =
    objectifCsv.trim().split("\n");

for (let i = 1; i < lignesObjectifs.length; i++) {

    const colonnes =
        lignesObjectifs[i]
            .replace(/\r/g, "")
            .split("\t");

    if (colonnes.length < 3) continue;

    const objectif =
        colonnes[0].trim();

    const cible =
        nettoyerNombre(colonnes[1]);

    const actuel =
        nettoyerNombre(colonnes[2]);

    const pourcentage =
        cible > 0
            ? (actuel / cible) * 100
            : 0;

    const label =
        document.getElementById(
            "goal-" + objectif
        );

    const barre =
        document.getElementById(
            "bar-" + objectif
        );

    if (label) {

        label.textContent =
            `${Math.round(actuel).toLocaleString("fr-FR")} € / ${Math.round(cible).toLocaleString("fr-FR")} € (${pourcentage.toFixed(1)}%)`;
    }

    if (barre) {

        barre.style.width =
            Math.min(
                pourcentage,
                100
            ) + "%";
    }
}
