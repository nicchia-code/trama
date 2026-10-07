---
column: done
technical: false
refs:
  - agent-terminal
  - drift/Open/agent.REPLACE_DRIFT_PROPOSAL
  - requirements/rules#agent-terminal
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:05:36.784Z
finished: 2026-10-07T17:18:20.028Z
---
# Attach reworked Draft to the Drift before handing it over

L'istruzione inviata all'agente per rifare la Proposal obsoleta allegata a un Drift chiede ancora di consegnare la nuova Proposal e solo dopo allegarla al Drift. La Requirement ora vuole l'ordine opposto: il testo deve essere esattamente «Use the trama-design skill, without asking questions. Proposal <p>, attached to Drift <d>, is stale: write a new Proposal that makes the same change on the current Model and Requirements, attach it to the Drift in place of the stale one as soon as you create it, then hand it over.», con la frase della lingua in coda quando una lingua è impostata.

Fatto quando: il pulsante Rework Proposal invia questa istruzione, con l'aggancio della Draft subito dopo la creazione e la consegna alla fine, così la nuova Proposal non compare mai da sola in To decide. Il rifiuto (Drift non aperto, Proposal allegata non aperta o non obsoleta) e il nome del terminale `Design` restano come sono.
