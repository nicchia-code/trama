---
column: done
technical: true
refs:
  - requirements/data#proposal
  - requirements/ui#proposal
drift: null
proposal: 2oj2rgp7
agent: false
created: 2026-10-21T04:57:27.914Z
finished: 2026-10-21T04:59:50.428Z
---
# Modello Proposal: cursor e omp

Il modello scelto per una Proposal vale solo per i due agenti rimasti, `cursor` (la chat di Cursor) e `omp`.

In `extension/src/host/proposal-models.ts` `PROPOSAL_AGENTS` diventa `["cursor", "omp"]` (e con esso `ProposalAgent`). In `trama.proposalModels` una voce `{ model, agent }` con `agent: "cursor"` o `"omp"` è valida come prima. Una voce scritta da una versione precedente con `agent: "chat"` vale come `cursor`: `proposalModels` (tramite `validEntry` o una normalizzazione accanto) la legge con `agent: "cursor"`, e poiché ogni scrittura (`chooseProposalModel`, `forgetProposalModels`) riscrive l'oggetto letto, alla prossima scrittura la voce è salvata con `cursor`. Una voce con `agent: "claude"` (o qualunque altro agente) ha una forma non valida: è ignorata e tolta alla prossima scrittura, come le altre voci malformate. Nessun'altra conversione.

Un modello vale per il lavoro della Proposal solo quando il suo agente è uguale al valore effettivo corrente di `trama.agent` (dove ogni valore diverso da `omp` conta come `cursor`): `boardModels` e `appliedProposalModels` ricevono quel valore effettivo, così un modello scelto per `omp` non vale con `cursor` e viceversa, e uno nato `chat` vale con `cursor`.

Sulla Board (`extension/src/webview/board/logic.ts`) `AGENT_NAMES` diventa `{ cursor: "Cursor's chat", omp: "omp" }`, e `NO_MODELS` usa `agent: "cursor"`. Il badge barrato del modello scelto per l'altro agente (`cards.tsx`) ha tooltip e nome accessibile `Chosen for <agente>: the Settings roles apply` con `<agente>` uguale a `omp` o `Cursor's chat`; la frase della modale in `dialogs.tsx` usa gli stessi nomi.

Test da aggiornare: `test/host-proposal-models.test.ts` (sostituire `chat`/`claude` con `cursor`/`omp`; aggiungere che una voce `chat` si legge come `cursor` e si riscrive `cursor` alla scrittura successiva, e che una voce `claude` è ignorata e tolta), `test/board-logic.test.ts` (il modello con `agent: "claude"` diventa `cursor`), `test/board-render.test.tsx` (agente corrente `cursor` al posto di `claude`, frase della modale `Confirm a model to use it with Cursor's chat.`, e un caso con badge `Chosen for Cursor's chat: the Settings roles apply`).
