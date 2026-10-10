---
status: resolved
resolution: proposal
refs:
  - requirements/ui#proposal
  - panel/Board
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: 48s86zzo
created: 2026-10-09T08:46:19.503Z
---
# Resolves Drifts rows show the note's text instead of a note marker

## What happens

Nel blocco «Resolves Drifts» di una Proposal di risoluzione, sulla scheda della Board e nei dettagli del Diagramma, la riga di un Drift da correggere con una nota termina con **l'intero testo della nota** dopo « · », per esempio «Code fixed with option Fix the code · do it today». La nota è la risposta libera del developer e può essere lunga.

## What should happen

La riga termina con il segno fisso ` · note` quando c'è una nota, senza il suo testo. Il testo della nota compare solo in `trama proposal show`, che per una correzione mostra «anche il testo della nota».

## Fix options

### Show only the note marker

Le righe del pannello finiscono con « · note» quando la decisione ha una nota; il testo resta leggibile con `trama proposal show`. Cambio piccolo nella costruzione delle righe, condivisa da Board e Diagramma, e nel test che oggi si aspetta il testo.

### Allow the note text in the Requirement

Si riscrive `requirements/ui#proposal` per dire che la riga mostra il testo della nota dopo « · ». Nessun cambio di codice; una nota lunga allunga la riga della scheda, e conviene decidere anche se troncarla.

## Where in the code

src/core/resolution.ts (`resolvedDrifts`) and extension/src/webview/board/logic.ts (`resolvedRows`), drawn by extension/src/webview/resolves.ts
