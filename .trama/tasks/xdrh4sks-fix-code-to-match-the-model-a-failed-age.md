---
column: done
technical: false
refs:
  - proposal/Open/developer.APPROVE_PROPOSAL
  - requirements/rules#proposal/In worktree
drift: 0s6m4enj
proposal: null
agent: false
created: 2026-10-06T19:00:17.051Z
finished: 2026-10-06T19:33:31.485Z
---
# Fix code to match the Model: A failed agent start keeps the Proposal in its worktree

## What happens

Se il worktree viene creato ma **l’agente non può partire**, l’accettazione fallisce con un errore e tuttavia la Proposal rimane In worktree. Non torna fra quelle da decidere, non può essere approvata o rifiutata di nuovo e il giro conserva un worktree senza agente. Per esempio, questo accade se il canale delle domande dell’editor non è disponibile al momento dell’avvio.

## What should happen

L’accettazione con multi-branch acceso deve creare il worktree e **avviare l’agente**. Se una condizione dell’ingresso fallisce, la Proposal deve restare Open e il developer deve conoscere il motivo, senza ritrovarla trasferita al giro nonostante il fallimento.

## Chosen option

**Undo acceptance when launch fails**

Se l’avvio dell’agente fallisce, togliere dal giro il solo worktree appena creato e riportare la Proposal fra quelle da decidere, conservando intatte le altre Proposal del giro. Il developer vede il motivo e può riprovare l’accettazione. Richiede il ripristino della situazione precedente anche quando il giro esisteva già.

## Where in the code

extension/src/host/acceptance.ts, acceptOrdinaryProposal; extension/src/host/agent.ts, openWorktreeTerminal; extension/src/host/controller.ts, approving and approveFromCommand
