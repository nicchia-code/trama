---
column: done
technical: false
refs:
  - proposal/Draft/agent.EDIT_PROPOSAL
  - proposal/Open/agent.EDIT_PROPOSAL
  - requirements/tech#project
  - requirements/data#General
drift: null
proposal: euf9nx59
agent: false
created: 2026-10-05T13:21:55.586Z
---
# Far scrivere alle Proposal i file di area.md e dei frammenti

`trama proposal edit` e `trama proposal delete` accettano `requirements/<area>/area.md` e `requirements/<area>/<frammento>.md`, anche per un frammento o un'Area nuovi, e rifiutano `requirements/<area>.md` e percorsi più profondi, dicendo perché. `trama proposal show` mostra i cambiamenti dei Requisiti per Area e frammento, e la validazione di una Proposal applicata vede l'Area intera, con i frammenti cambiati e quelli che restano.
