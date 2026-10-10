---
status: resolved
resolution: fix-code
refs:
  - panel/Board
  - requirements/ui#panel/Board
  - requirements/ui#proposal
proposal: null
task: jnhtybbb
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T13:06:23.072Z
---
# La Board separa ancora la risoluzione dai suoi Drift

## What happens

Quando una Proposal di risoluzione è consegnata, To decide mostra **la Proposal e i suoi Drift aperti come schede separate**. La colonna e il numero della tab Board contano anche ciascun Drift raccolto nella risoluzione. La scheda della risoluzione resta blu come una Proposal ordinaria e il suo nome accessibile non la distingue come risoluzione. Il blocco Resolves Drifts, le decisioni, i collegamenti ai Drift e i pulsanti per approvare o rifiutare tutta la Proposal sono già presenti.

## What should happen

Una risoluzione consegnata e i Drift aperti che elenca devono formare **una sola scheda gialla**, contata una volta nella colonna e nella tab Board. Il suo nome accessibile deve identificarla come Proposal di risoluzione. I Drift restano aperti e disponibili nel Diagramma, ma non hanno schede rosse autonome finché la risoluzione è aperta. Se torna in scrittura, viene rifiutata o scartata, le schede rosse dei Drift ancora aperti ricompaiono nel loro ordine di creazione. Una risoluzione bloccata conserva la scheda gialla, i motivi di blocco e i controlli; decidere resta un gesto sulla risoluzione intera.

## Fix options

### Unificare le schede nella Board

Mostrare i Drift raccolti soltanto dentro la scheda della risoluzione aperta, conservando il blocco delle decisioni e i collegamenti già presenti. Dare alla scheda il segno giallo e il nome accessibile di risoluzione; ricavare entrambi i conteggi dalle schede visibili. Il costo è riallineare visualizzazione e conteggi senza cambiare lo stato dei Drift né ciò che mostra il Diagramma.

### Derivare insieme schede visibili e conteggi

Calcolare un unico elenco delle schede da decidere per la Board e il suo numero sulla tab: ogni risoluzione aperta occupa un posto e contiene i propri Drift, distinguendosi in giallo e nel nome accessibile. Usare lo stesso elenco quando le Proposal cambiano stato. Il risultato visibile è identico; il costo è accentrare la derivazione dei conteggi mantenendo separata la lista completa dei Drift per il Diagramma.

## Where in the code

extension/src/webview/board/logic.ts: buildBoard e proposalCard; extension/src/webview/board/render.ts: proposal; extension/src/webview/board/board.css: board-card-proposal; extension/src/webview/main.ts: conteggio della tab Board; src/core/snapshot.ts: buildSnapshot.
