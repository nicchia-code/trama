---
column: done
technical: true
refs:
  - requirements/tech#agent-terminal
drift: ikl4pf97
proposal: null
agent: false
created: 2026-10-06T17:59:44.372Z
finished: 2026-10-06T18:10:40.601Z
---
# Fix code to match the Requirements: Il marcatore di una finestra esterna sostituita rilascia i suoi Task, i Requisiti dicono che non conta

## What happens

Con il launcher **external-terminal**, quando una nuova istruzione apre una finestra nuova mentre la vecchia lavora ancora, la fine del comando nella **finestra sostituita** rilascia i Task che quella finestra aveva preso (tornano in To do) e ritira i suoi annunci, senza avvisi e senza cambiare lo stato dell'agente.

È la correzione scelta dal developer per il Drift nsd79ikm, che chiedeva anche di precisare i Requisiti con una Proposal: quella Proposal non è mai stata fatta.

## What should happen

I Requisiti dell'agent-terminal (in `tech` e in `rules`) dicono ancora che il marcatore di una finestra che Trama non segue più **si cancella e non conta**: alla lettera la fine della finestra sostituita non dovrebbe rilasciare nulla.

Il Model invece è con il codice: la fine del comando nel terminale che ha preso il Task lo rilascia. Mancano solo i Requisiti aggiornati.

## Chosen option

**Approvare la Proposal allegata**

La Proposal precisa nei Requisiti `tech` e `rules` dell'agent-terminal che il marcatore di una finestra sostituita mentre lavorava rilascia i Task presi da quella finestra e ritira i suoi annunci, senza avvisi e senza toccare lo stato dell'agente. Il codice e il Model restano come sono. Costo: la revisione di due righe di Requisiti.

## Where in the code

extension/src/host/external-terminal.ts (`ExternalRuns`, `onReplacedEnded`); extension/src/host/agent.ts (`watchExternalRuns`)
