---
column: done
technical: false
refs:
  - drift/Open
  - drift
  - requirements/rules#drift
  - requirements/data#drift
  - requirements/tech#drift
drift: null
proposal: h9rkity1
agent: false
created: 2026-10-12T18:57:24.348Z
finished: 2026-10-12T19:36:55.007Z
---
# File a Drift without fix options with its Proposal

Un Drift nuovo senza correzione del codice possibile non ha la sezione Fix options e deve avere una Proposal allegata. trama drift new senza nessun --option è accettato solo con --proposal e scrive il Drift senza Fix options; senza --proposal è rifiutato, dicendo che un Drift senza Fix options richiede una Proposal allegata. Con due-cinque opzioni il comportamento non cambia; una sola opzione o più di cinque restano rifiutate. Il Drift così creato resta Open per intervento manuale, perché non ha modi di correggere il codice da scegliere.
