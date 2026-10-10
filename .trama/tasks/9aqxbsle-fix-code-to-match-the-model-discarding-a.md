---
column: done
technical: false
refs:
  - proposal/Draft/developer.DISCARD_PROPOSAL
  - requirements/rules#proposal
drift: haxrfyc2
proposal: null
agent: false
created: 2026-10-10T09:02:18.951Z
finished: 2026-10-10T09:05:17.568Z
---
# Fix code to match the Model: Discarding an attached Draft is refused

## What happens

Il developer prova a scartare una bozza che l'agente sta ancora scrivendo, ma quella bozza è allegata a un Drift aperto. Il sistema rifiuta lo scarto e dice di decidere sul Drift, anche se il Modello dice che il developer può scartare ogni bozza non finita.

## What should happen

Il developer può scartare una bozza non finita dalla riga di comando, anche se è allegata a un Drift aperto: la bozza passa a scartata senza feedback, e il Drift resta aperto e com'è. Il rifiuto riguarda solo approvare e rifiutare direttamente una Proposal allegata.

## Chosen option

**Consentire lo scarto della bozza allegata**

Lo scarto della bozza allegata a un Drift aperto è accettato come dice il Modello: la bozza diventa scartata senza feedback, e il Drift resta aperto, con il suo collegamento perso. Il developer può così liberarsi di una bozza abbandonata senza passare dal Drift. Costo: il Drift resta senza bozza da decidere, e va deciso a parte.

## Where in the code

Comando proposal discard in src/cli/commands.ts; controllo requireNotAttached in src/core/work.ts; test in test/workflow.test.ts
