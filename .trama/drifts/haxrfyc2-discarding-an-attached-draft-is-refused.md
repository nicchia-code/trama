---
status: resolved
resolution: fix-code
refs:
  - proposal/Draft/developer.DISCARD_PROPOSAL
  - requirements/rules#proposal
proposal: null
task: 9aqxbsle
origin: null
option: 1
note: null
resolvedBy: i0e2coiq
created: 2026-10-10T08:46:36.327Z
---
# Discarding an attached Draft is refused

## What happens

Il developer prova a scartare una bozza che l'agente sta ancora scrivendo, ma quella bozza è allegata a un Drift aperto. Il sistema rifiuta lo scarto e dice di decidere sul Drift, anche se il Modello dice che il developer può scartare ogni bozza non finita.

## What should happen

Il developer può scartare una bozza non finita dalla riga di comando, anche se è allegata a un Drift aperto: la bozza passa a scartata senza feedback, e il Drift resta aperto e com'è. Il rifiuto riguarda solo approvare e rifiutare direttamente una Proposal allegata.

## Fix options

### Consentire lo scarto della bozza allegata

Lo scarto della bozza allegata a un Drift aperto è accettato come dice il Modello: la bozza diventa scartata senza feedback, e il Drift resta aperto, con il suo collegamento perso. Il developer può così liberarsi di una bozza abbandonata senza passare dal Drift. Costo: il Drift resta senza bozza da decidere, e va deciso a parte.

### Mantenere il rifiuto e cambiare il Modello

Il rifiuto dello scarto resta, e il Modello dice che una bozza allegata a un Drift aperto si scarta solo con il Drift. Il Modello e i Requisiti vanno aggiornati con una Proposal, e il test che lo verifica resta valido. Costo: una Proposal da approvare, e il developer deve passare dal Drift per liberarsi della bozza.

## Where in the code

Comando proposal discard in src/cli/commands.ts; controllo requireNotAttached in src/core/work.ts; test in test/workflow.test.ts
