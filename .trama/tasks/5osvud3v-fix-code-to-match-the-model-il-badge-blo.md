---
column: done
technical: false
refs:
  - developer.CHOOSE_DRAWN_PROPOSAL
  - requirements/ui#panel/Board
drift: ueo8ueoc
proposal: null
agent: false
created: 2026-10-06T20:47:48.129Z
finished: 2026-10-06T20:51:06.630Z
---
# Fix code to match the Model: Il badge blocked porta al Drift senza disegnare la sua Proposal

## What happens

Quando il developer segue il badge `blocked` di un Task sulla Board, il Diagramma va al livello del Drift e lo **seleziona**, ma la Proposal disegnata resta quella di prima (anche None), pure se il Drift porta con sé un'altra Proposal aperta.

Selezionando lo stesso Drift con un click sul Diagramma, invece, la Proposal disegnata diventa la sua. Così, dal badge, il dettaglio del Drift non dice «drawn in the diagram» e il Diagramma non mostra cosa farebbe accettarla; se il Drift punta solo a elementi che esistono con la sua Proposal, il badge non lo mostra affatto.

## What should happen

Selezionare un Drift che porta con sé una Proposal diversa da quella disegnata è `developer.CHOOSE_DRAWN_PROPOSAL`: il Diagramma **disegna quella Proposal**, in qualunque modo il Drift venga selezionato, e il livello ricade secondo le Transizioni dell'Evento se ciò che si guarda non esiste più nel Modello disegnato.

Il badge `blocked` «porta a quel Drift sul Diagramma» (`ui#panel/Board`), quindi arrivarci dal badge dovrebbe dare lo stesso risultato del click.

## Chosen option

**Il badge disegna la Proposal del Drift**

Arrivando a un Drift dal badge (o da qualunque link che punta a un Drift), il Diagramma sceglie prima la Proposal attaccata, se è fra quelle aperte, e poi cerca dove disegnare il Drift. Stesso comportamento del click, nessun cambio al Modello; costo: piccola modifica alla navigazione verso un Drift.

## Where in the code

`extension/src/webview/diagram/index.ts`: `navigateDrift`/`apply` (il badge manda solo il Drift) contro `selectId`; il badge è in `extension/src/webview/board/render.ts`.
