---
column: done
technical: true
refs:
  - requirements/tech#proposal
  - requirements/ui#proposal
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:03:10.789Z
---
# Badge modello senza agente

La Board mostra il modello di una Proposal senza nessun riferimento all'agente per cui era stato scelto.

Quando è fatto vale che:
- Il quadro della Board porta, per ogni Proposal in Backlog che porta Task, `model` uguale a `{ name }` oppure nulla: niente più `agent` né `applies`, e niente `agent` a livello del quadro dei modelli. Il quadro si rimanda quando cambia lo stato, non più quando cambia `trama.agent`, che non esiste più.
- Con un modello scelto la scheda ha, subito a sinistra dell'ingranaggio, un solo badge con il nome intero del modello e tooltip e nome accessibile `Model for this Proposal's work: <modello>`; senza modello nessun badge. Il badge barrato e attenuato `Chosen for <agente>: the Settings roles apply` non esiste più.
- La modale `Model for <numero breve> <titolo>` non ha più la riga `Chosen for …: the Settings roles apply. Confirm a model to use it with …`; il resto (campo, suggerimenti di omp, segnaposto, chiusura e focus) resta com'è.

Codice da cambiare (indicazioni):
- `extension/src/host/proposal-models.ts`: `BoardProposalModel` diventa `{ name }`, `BoardModels` perde `agent`, `boardModels` non riceve più l'agente; chi la chiama nell'host non passa più l'agente e non rimanda il quadro al cambio di `trama.agent`.
- `extension/src/webview/board/logic.ts`: togliere `AGENT_NAMES` (righe 16-20) e l'`agent` di `NO_MODELS`.
- `extension/src/webview/board/cards.tsx` (righe 172-184): togliere il ramo del badge barrato e l'import di `AGENT_NAMES`.
- `extension/src/webview/board/dialogs.tsx` (righe 206-219): `ModelDialog` perde la prop `agent` e la riga "Chosen for"; `extension/src/webview/board/index.tsx` (righe 50 e 335) non la passa più e aggiorna il commento di `models`; i tipi in `extension/src/protocol.ts` seguono.

Test: aggiornare `test/board-render.test.tsx` e `test/board-logic.test.ts` togliendo i casi del badge barrato e della riga "Chosen for", e i quadri di prova con `agent`/`applies`.
