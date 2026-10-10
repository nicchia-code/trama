---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
  - requirements/ui#proposal
drift: k0nezhma
proposal: null
agent: false
created: 2026-10-10T14:15:27.031Z
finished: 2026-10-10T16:26:15.437Z
---
# Fix code to match the Model: La Board separa ancora la risoluzione dai suoi Drift

## What happens

Quando una Proposal di risoluzione è consegnata, To decide mostra **la Proposal e i suoi Drift aperti come schede separate**. La colonna e il numero della tab Board contano anche ciascun Drift raccolto nella risoluzione. La scheda della risoluzione resta blu come una Proposal ordinaria e il suo nome accessibile non la distingue come risoluzione. Il blocco Resolves Drifts, le decisioni, i collegamenti ai Drift e i pulsanti per approvare o rifiutare tutta la Proposal sono già presenti.

## What should happen

Una risoluzione consegnata e i Drift aperti che elenca devono formare **una sola scheda gialla**, contata una volta nella colonna e nella tab Board. Il suo nome accessibile deve identificarla come Proposal di risoluzione. I Drift restano aperti e disponibili nel Diagramma, ma non hanno schede rosse autonome finché la risoluzione è aperta. Se torna in scrittura, viene rifiutata o scartata, le schede rosse dei Drift ancora aperti ricompaiono nel loro ordine di creazione. Una risoluzione bloccata conserva la scheda gialla, i motivi di blocco e i controlli; decidere resta un gesto sulla risoluzione intera.

## Chosen option

**Unificare le schede nella Board**

Mostrare i Drift raccolti soltanto dentro la scheda della risoluzione aperta, conservando il blocco delle decisioni e i collegamenti già presenti. Dare alla scheda il segno giallo e il nome accessibile di risoluzione; ricavare entrambi i conteggi dalle schede visibili. Il costo è riallineare visualizzazione e conteggi senza cambiare lo stato dei Drift né ciò che mostra il Diagramma.

## Where in the code

extension/src/webview/board/logic.ts: buildBoard e proposalCard; extension/src/webview/board/render.ts: proposal; extension/src/webview/board/board.css: board-card-proposal; extension/src/webview/main.ts: conteggio della tab Board; src/core/snapshot.ts: buildSnapshot.
