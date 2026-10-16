---
column: done
technical: false
refs:
  - panel/Diagram
  - requirements/rules#project
drift: null
proposal: 22tzcpm3
agent: false
created: 2026-10-16T05:17:54.965Z
finished: 2026-10-16T05:51:00.357Z
---
# Aprire subito la richiesta di setup da Start from Scratch nel Diagramma

Quando il Task è finito, Start from Scratch nel Diagramma con il Modello vuoto, in una cartella che è già un progetto Trama, apre subito la richiesta di setup del progetto: nessun dialogo della cartella con file (anche se la cartella ha file visibili, come ha sempre un progetto esistente), nessuna scelta della cartella e nessuna inizializzazione. Oggi il dialogo compare lo stesso, perché il controllo dei file visibili avviene prima di quello di `.trama/`.

Start from Scratch da Get Started, in una cartella senza progetto, resta com'è: il dialogo della cartella con file compare solo quando il primo livello della cartella ha un file o una cartella il cui nome non comincia con un punto, e Import from Code non lo mostra mai.

Allineare la documentazione al comportamento del Diagramma e di Start from Scratch: in `docs/uat.md` i passi J4, J4a e J6 (il Diagramma con il Modello vuoto offre «Import from Code» e «Start from Scratch», con il testo e i tooltip di `ui#panel/Diagram`; il dialogo della cartella con file ha il testo e i pulsanti di `ui#project`), più un passo per Start from Scratch dal Diagramma senza dialogo; in `README.md`, `extension/README.md` e `CHANGELOG.md` le frasi che dicono che il Diagramma vuoto offre «Design…» o che Start from Scratch avvisa che la cartella «is not empty».
