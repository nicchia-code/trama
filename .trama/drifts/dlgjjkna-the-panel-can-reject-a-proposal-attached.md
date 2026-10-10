---
status: open
resolution: null
refs:
  - proposal/Open/developer.REJECT_PROPOSAL
  - requirements/rules#proposal
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: null
created: 2026-10-10T08:07:30.018Z
---
# The panel can reject a Proposal attached to a Drift while the feedback box is open

## What happens

Quando il developer rifiuta una Proposal dal pannello, Trama controlla che **non sia allegata a un Drift aperto** solo prima di chiedere il feedback. Mentre la casella del feedback resta aperta (anche a lungo, non si chiude perdendo il focus) l'agente può allegare quella Proposal aperta a un Drift nuovo. Alla conferma il rifiuto passa comunque: la Proposal diventa rifiutata e il Drift resta aperto con una Proposal già decisa da sola, fuori dal Drift.

## What should happen

Il rifiuto diretto di una Proposal allegata a un Drift aperto è **sempre rifiutato**, senza cambiare nulla, con il messaggio che nomina il Drift e dice di decidere su di esso. La regola vale nel momento in cui il rifiuto avviene, non solo quando il developer preme il pulsante; con la Proposal allegata si decide solo attraverso il Drift.

## Fix options

### Check again at the moment of rejecting

Il controllo dell'allegato si ripete nel momento in cui il rifiuto viene applicato, dopo la casella del feedback, come già succede per lo stato della Proposal. Se nel frattempo è stata allegata, il developer riceve il messaggio che nomina il Drift e nulla cambia. Modifica piccola, solo nel pannello.

### Put the rule inside the shared rejection and approval

Il rifiuto e l'approvazione diretti condivisi da riga di comando e pannello rifiutano da soli una Proposal allegata a un Drift aperto, mentre l'accettazione attraverso il Drift passa per una via che lo consente. Nessun chiamante può più dimenticare la regola o applicarla in ritardo; costa toccare anche la risoluzione dei Drift, che oggi usa le stesse operazioni.

## Where in the code

extension/src/host/controller.ts, messaggio `rejectProposal` (controllo `requireNotAttached` prima di `showInputBox`, poi `rejectProposal` senza ricontrollo); src/core/proposals.ts `rejectProposal`, che ricontrolla lo stato ma non l'allegato.
