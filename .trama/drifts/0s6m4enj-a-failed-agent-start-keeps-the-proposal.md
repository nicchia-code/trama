---
status: resolved
resolution: fix-code
refs:
  - proposal/Open/developer.APPROVE_PROPOSAL
  - requirements/rules#proposal/In worktree
proposal: null
task: xdrh4sks
origin: null
option: 1
note: null
created: 2026-10-06T18:59:16.120Z
---
# L’avvio fallito dell’agente lascia la Proposal nel worktree

## What happens

Se il worktree viene creato ma **l’agente non può partire**, l’accettazione fallisce con un errore e tuttavia la Proposal rimane In worktree. Non torna fra quelle da decidere, non può essere approvata o rifiutata di nuovo e il giro conserva un worktree senza agente. Per esempio, questo accade se il canale delle domande dell’editor non è disponibile al momento dell’avvio.

## What should happen

L’accettazione con multi-branch acceso deve creare il worktree e **avviare l’agente**. Se una condizione dell’ingresso fallisce, la Proposal deve restare Open e il developer deve conoscere il motivo, senza ritrovarla trasferita al giro nonostante il fallimento.

## Fix options

### Annullare l’accettazione se l’avvio fallisce

Se l’avvio dell’agente fallisce, togliere dal giro il solo worktree appena creato e riportare la Proposal fra quelle da decidere, conservando intatte le altre Proposal del giro. Il developer vede il motivo e può riprovare l’accettazione. Richiede il ripristino della situazione precedente anche quando il giro esisteva già.

### Preparare l’avvio prima dell’accettazione

Preparare e verificare le risorse necessarie all’agente prima di trasferire la Proposal al giro; se manca il canale dell’editor o il terminale non è disponibile, rifiutare subito l’accettazione. Completare l’ingresso soltanto con un avvio riuscito. Evita worktree inutilizzati, ma richiede tenere coerenti preparazione e avvio fino al termine della decisione.

## Where in the code

extension/src/host/acceptance.ts, acceptOrdinaryProposal; extension/src/host/agent.ts, openWorktreeTerminal; extension/src/host/controller.ts, approving and approveFromCommand
