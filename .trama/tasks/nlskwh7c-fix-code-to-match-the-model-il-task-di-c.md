---
column: done
technical: false
refs:
  - task
drift: pvk02qfk
proposal: null
agent: false
created: 2026-10-05T15:12:19.864Z
---
# Fix code to match the Model: Il Task di correzione di un Drift nato in un design non appartiene a quel design

## What happens

Con la decisione «correggi il codice» il Task di correzione nasce **fuori da ogni design**, come dice oggi il Modello del Task. Così, in un worktree, il rilancio dei Task della Proposal non lo esegue, il Task d'origine aspetta lui e il giro resta fermo.

## What should happen

L'opzione scelta sul Drift rh3dwa07 chiede che il Task di correzione **appartenga alla Proposal** del Task d'origine e che il rilancio esegua i Task di quella Proposal. Il Modello del Task dice invece che un Task che corregge un Drift non fa parte di alcun design: seguire l'opzione vorrebbe dire contraddire il Modello.

## Chosen option

**Approvare la Proposal allegata**

Il Modello dice che la correzione eredita il design del Task d'origine, anche se tecnica, e che il rilancio nel worktree esegue i Task di quella Proposal. Poi il codice segue: la correzione compare nella scheda di design e l'unione la aspetta. Cambia anche fuori dai worktree.

## Where in the code

src/core/work.ts (resolveDrift); extension/src/host/agent.ts (resumeWorktreeTasks)
