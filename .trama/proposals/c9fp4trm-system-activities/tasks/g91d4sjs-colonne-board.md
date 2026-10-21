---
technical: false
refs:
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#panel/Board
  - requirements/tech#panel/Board
---

# Colonne Board e System Activities

Quando il developer apre la Board (`developer.SHOW_BOARD`) le colonne sono `Backlog`, `Active`, `System Activities` e `History`, in quest'ordine; la colonna `Blocked` non c'è più. Vuote, `Backlog` dice `Nothing to decide`, `Active` dice `Nothing active` e `System Activities` dice `Nothing running`.

`System Activities` mostra soltanto i ghost, di ogni tipo (Proposal, Task, Drift, Check/Scan, Resolve, Import, Compare), nell'ordine di annuncio, senza numero accanto al titolo e senza pulsante in fondo; `Active` non mostra più ghost. Gli avvisi dei ghost ritirati restano in cima alla Board.

`Backlog` contiene le Proposal, le schede gialle di risoluzione (una al posto della sua Proposal) e le schede rosse dei Drift aperti che non stanno in una risoluzione consegnata, in un solo ordine di creazione. Tornare a Draft, rifiutare o scartare la risoluzione ripristina le schede rosse dei Drift ancora aperti. `Active` mostra ogni Task in To do o In progress, bloccato o no, in ordine di creazione; non ci sono più schede di attesa.

Il numero sulla tab Board conta le schede di `Backlog` (ogni Proposal, ogni risoluzione una volta, ogni scheda rossa di Drift); i ghost non contano. I numeri accanto a `Backlog` e `Active` contano le schede vere, mai i ghost.

`Resolve all` sparisce dalla Board: in fondo a `Backlog` resta solo `+ Add Work Item`, in fondo ad `Active` solo `Run all`. Il messaggio `resolveDrifts` senza identità di un Drift non esiste più e l'host non lo accetta; resta `Resolve` sul singolo Drift. Il quadro della Board continua a portare le identità in attesa del turno.

Indicazioni: `extension/src/webview/board/logic.ts` (`CardColumnId`, `COLUMN_TITLES`, `EMPTY_HINTS`, `buildBoard`, `boardDecisionCount`, `GHOST_COLUMN`, `waitingCard`), `board/index.tsx` (pulsanti in fondo, griglia), `extension/src/protocol.ts`, `host/controller.ts`; test `test/board-logic.test.ts`, `test/board-render.test.tsx`.
