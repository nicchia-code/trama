---
column: done
technical: false
refs:
  - proposal/Open/developer.REJECT_PROPOSAL
  - requirements/rules#proposal
drift: dlgjjkna
proposal: null
agent: false
created: 2026-10-10T08:32:21.894Z
finished: 2026-10-10T08:34:58.108Z
---
# Fix code to match the Model: The panel can reject a Proposal attached to a Drift while the feedback box is open

## What happens

Quando il developer rifiuta una Proposal dal pannello, Trama controlla che **non sia allegata a un Drift aperto** solo prima di chiedere il feedback. Mentre la casella del feedback resta aperta (anche a lungo, non si chiude perdendo il focus) l'agente può allegare quella Proposal aperta a un Drift nuovo. Alla conferma il rifiuto passa comunque: la Proposal diventa rifiutata e il Drift resta aperto con una Proposal già decisa da sola, fuori dal Drift.

## What should happen

Il rifiuto diretto di una Proposal allegata a un Drift aperto è **sempre rifiutato**, senza cambiare nulla, con il messaggio che nomina il Drift e dice di decidere su di esso. La regola vale nel momento in cui il rifiuto avviene, non solo quando il developer preme il pulsante; con la Proposal allegata si decide solo attraverso il Drift.

## Chosen option

**Check again at the moment of rejecting**

Il controllo dell'allegato si ripete nel momento in cui il rifiuto viene applicato, dopo la casella del feedback, come già succede per lo stato della Proposal. Se nel frattempo è stata allegata, il developer riceve il messaggio che nomina il Drift e nulla cambia. Modifica piccola, solo nel pannello.

## Where in the code

extension/src/host/controller.ts, messaggio `rejectProposal` (controllo `requireNotAttached` prima di `showInputBox`, poi `rejectProposal` senza ricontrollo); src/core/proposals.ts `rejectProposal`, che ricontrolla lo stato ma non l'allegato.
