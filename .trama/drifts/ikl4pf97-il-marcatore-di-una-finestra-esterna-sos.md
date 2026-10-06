---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#agent-terminal
proposal: d3hg7ap2
task: jylrak64
origin: null
option: 1
note: null
created: 2026-10-06T17:55:39.346Z
---
# Il marcatore di una finestra esterna sostituita rilascia i suoi Task, i Requisiti dicono che non conta

## What happens

Con il launcher **external-terminal**, quando una nuova istruzione apre una finestra nuova mentre la vecchia lavora ancora, la fine del comando nella **finestra sostituita** rilascia i Task che quella finestra aveva preso (tornano in To do) e ritira i suoi annunci, senza avvisi e senza cambiare lo stato dell'agente.

È la correzione scelta dal developer per il Drift nsd79ikm, che chiedeva anche di precisare i Requisiti con una Proposal: quella Proposal non è mai stata fatta.

## What should happen

I Requisiti dell'agent-terminal (in `tech` e in `rules`) dicono ancora che il marcatore di una finestra che Trama non segue più **si cancella e non conta**: alla lettera la fine della finestra sostituita non dovrebbe rilasciare nulla.

Il Model invece è con il codice: la fine del comando nel terminale che ha preso il Task lo rilascia. Mancano solo i Requisiti aggiornati.

## Fix options

### Approvare la Proposal allegata

La Proposal precisa nei Requisiti `tech` e `rules` dell'agent-terminal che il marcatore di una finestra sostituita mentre lavorava rilascia i Task presi da quella finestra e ritira i suoi annunci, senza avvisi e senza toccare lo stato dell'agente. Il codice e il Model restano come sono. Costo: la revisione di due righe di Requisiti.

### Tornare a ignorare il marcatore della finestra sostituita

Il codice torna a cancellare senza effetto il marcatore di una finestra non più seguita, come dicono oggi i Requisiti. I Task presi lì restano presi finché il developer non li riprende a mano con `trama task take-back`, e Run all To do resta non disponibile intanto. Contraddice la Transition del Model su `terminal.COMMAND_ENDED` e la scelta fatta sul Drift nsd79ikm, quindi servirebbe anche cambiare il Model.

## Where in the code

extension/src/host/external-terminal.ts (`ExternalRuns`, `onReplacedEnded`); extension/src/host/agent.ts (`watchExternalRuns`)
