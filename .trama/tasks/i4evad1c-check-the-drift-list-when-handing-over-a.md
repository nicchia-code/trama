---
column: done
technical: false
refs:
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - requirements/rules#proposal
  - requirements/tech#proposal
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:11:57.900Z
finished: 2026-10-09T08:23:21.110Z
---
# Check the Drift list when handing over a resolution

La consegna di una risoluzione deve controllare la sua lista di Drift; oggi la consegna guarda solo i file registrati e la validità del Modello.

Quando è fatto:
- `trama proposal submit` di una risoluzione è rifiutato, lasciandola Draft, quando la lista è vuota, quando un Drift della lista non è più aperto o quando sta anche nella lista di un'altra risoluzione in scrittura o aperta; il rifiuto nomina ogni Drift in difetto, insieme agli altri problemi della consegna.
- `trama validate --proposal <id>` di una risoluzione riporta gli stessi problemi della lista.
- Le Proposal che non sono risoluzioni si consegnano come prima.
