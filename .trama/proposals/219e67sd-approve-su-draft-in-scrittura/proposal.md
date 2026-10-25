---
status: approved
base:
  agent-launching/raffinamento.md: 451ae2d625c9cdb663083dfda9bdf76daa9b1824ef21600680661acd02b08910
  model-changes/proposal.md: 096b2a003a9bea686d3e03fd89ed04ecc076a63ccada93024c98136accc315c8
  requirements/rules/raffinamento.md: 6b5922a892c2c062af8151d59d878ed5c7fcb6c107cc34359de927652aa9dc9f
  requirements/ui/raffinamento.md: f0d3f658553b649c3a04fecabd632cdd2e1d3bf7662f59c72c84f3a69187a6f9
  requirements/tech/raffinamento.md: 07e8434f40763db4f478d3c68e97a04b21b5f8fd09a2447db9a07a6003a512ec
  requirements/rules/refine-all.md: new
delete: []
request: 2026-10-25T09-18-29
created: 2026-10-25T08:25:01.686Z
label: Approve su Draft
---
# Approve su Draft in scrittura

Oggi il developer può premere `Approve` (e `Reject`) su una Proposal che è ancora una Draft in scrittura: la scheda di una Draft rimasta a metà di un raffinamento resta in Backlog e nei dettagli del Diagramma con i pulsanti attivi, e il clic dà dopo l'errore «still being written» oppure, con Auto-update Stale Proposals acceso, lancia un secondo raffinamento sulla stessa Draft che un altro agente sta già scrivendo. I pulsanti devono essere disattivati e dire perché, invece di mostrare l'errore dopo.

## Decisioni

- Una Draft che un agente sta scrivendo (riconosciuta dall'annuncio ancora vivo legato a lei), anche se il lavoro non l'ha lanciato la coda di raffinamento di questa finestra (altra finestra, editor riaperto, lancio a mano), si mostra come un raffinamento in corso: badge `refining`, riga di fase e ultima nota dall'annuncio, `Approve`, `Reject` e freccetta disattivati con `The agent is refining this Proposal`, senza `Cancel`. Quando l'annuncio è ritirato torna `to refine` e `Approve` la riprende.
- Con Auto-update Stale Proposals spento, una Draft rimasta a metà che nessun agente scrive tiene la scheda con il chip `to refine`; `Approve`, `Reject` e freccetta sono disattivati con `Still being written. Turn on Auto-update Stale Proposals to resume refining`.
- Un clic che arriva comunque all'editor su una Proposal tornata Draft nel frattempo mostra il banner d'errore come oggi.
- Il motivo di scrittura in corso viene subito dopo `The agent is still finishing` e prima di `A run is in progress` e degli altri motivi.

## Assunzioni

- Il primo punto vale anche con Auto-update Stale Proposals spento: una Draft che un agente sta scrivendo si mostra come in raffinamento qualunque sia l'impostazione.
- Una Draft che non è stata riallineata da un raffinamento resta senza scheda, come oggi.
- Con Auto-update Stale Proposals spento, una Draft rimasta a metà non conta fra ciò che aspetta una decisione, perché il developer non può deciderla.
- Il tooltip del chip `to refine` di quella Draft, con la funzione spenta, diventa `Refining stopped before the hand-over. Turn on Auto-update Stale Proposals to resume it.`

## Already present

- `proposal/Open/agent.EDIT_PROPOSAL` — `src/core/proposals.ts` (ogni registrazione di un file riporta a Draft una Proposal aperta; `requireStatus` rifiuta approvazione e rifiuto di una Draft con «still being written», mostrato dal banner di `extension/src/webview/shell.tsx`)
