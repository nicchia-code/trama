---
column: done
technical: false
refs:
  - announcement
  - requirements/rules#announcement
  - requirements/ui#announcement
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T05:53:05.354Z
---
# Ghost in System Activities

Il ghost di ogni annuncio, di qualunque tipo (Proposal, Task, Drift, controllo, confronto, lavoro) e in ogni suo stato (Preparing, Writing, le fasi di un controllo, il confronto, il lavoro), si disegna nella colonna System Activities e non più in Active, che non mostra più ghost. Il tipo dice soltanto dove arriverà la scheda vera: Backlog per una Proposal o per un Drift (non più Blocked), Active per un Task, nessuna colonna per un controllo, un confronto o un lavoro.

Il ghost della Proposal di risoluzione che Trama annuncia con `Resolve` dice sempre «Resolving Drift <numero breve>», per l'unico Drift raccolto; il titolo al plurale «Resolving N Drifts» non esiste più, e il ghost tiene questo titolo anche dopo `agent.START_PROPOSAL`, finché la risoluzione non è consegnata.

Il titolo `Pre-flight before automatic fixes` non si produce più. Un confronto non ha fasi, non porta esito e non conta per nessuna barriera.

Indizi: `GHOST_COLUMN` e `announcedGhosts` in `extension/src/webview/board/logic.ts`, la costruzione del titolo di risoluzione nell'host (`extension/src/host/controller.ts`, `host/prompts.ts`), i test `test/board-logic.test.ts` e `test/board-render.test.tsx`.
