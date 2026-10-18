---
column: done
technical: false
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
drift: null
proposal: dmdqtk9h
agent: false
created: 2026-10-17T20:27:51.413Z
finished: 2026-10-17T20:54:36.680Z
---
# Portare la tab Settings tutto a destra come ingranaggio

A lavoro finito, nella barra in cima al pannello:

- La tab `Settings` è l'ultima, all'estremità destra, contro il margine destro della barra, separata dalle altre tab dallo spazio libero; le altre restano a sinistra nell'ordine `Board`, `Diagram`, `Requirements`, `Specs`.
- In Get Started, dove le tab sono solo `Get Started` e `Settings`, l'ingranaggio sta comunque tutto a destra.
- La tab mostra solo l'ingranaggio, il glifo codicon `settings-gear` a 16 px nel colore del testo, senza testo visibile e senza badge; tooltip e nome accessibile sono `Settings`.
- L'ingranaggio è l'SVG inline già presente nel modulo delle icone del webview, lo stesso delle schede delle Proposal: nessun font di icone, nessuna dipendenza nuova, nessuna voce nuova nelle note di terze parti.
- Selezionata o no si comporta come le altre tab: attenuata quando non è selezionata, piena al passaggio del puntatore, piena con la sottolineatura nel colore del fuoco quando è selezionata; resta una tab della barra, raggiunta da tastiera dopo le altre.
- Premerla porta come prima alla scheda Settings, con un progetto Trama come in Get Started.
