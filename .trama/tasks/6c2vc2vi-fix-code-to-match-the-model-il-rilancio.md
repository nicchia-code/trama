---
column: done
technical: false
refs:
  - worktree-round/In progress/developer.FIX_DRIFT_CODE
  - worktree-round/In progress/developer.ACCEPT_DRIFT_PROPOSAL
  - worktree-round/In progress/developer.DISMISS_DRIFT
  - requirements/rules#worktree-round
drift: 85ywi1fn
proposal: null
agent: false
created: 2026-10-06T13:27:55.922Z
---
# Fix code to match the Model: Il rilancio dopo la decisione su un Drift di un worktree non dice di saltare la scansione dell'intero System

## What happens

Dopo la decisione su un Drift di un worktree, Trama rilancia lì i Task rimasti della Proposal con l'istruzione ordinaria «implement a design», **senza** la frase "Do not scan the whole System at the end: Trama checks the code after the merge.".

Così, finiti i Task, l'agente può fare nel worktree la **scansione dell'intero System** e archiviare lì Task legati alla Proposal, che tengono fermo il giro, mentre il controllo del codice spetta alla scansione dopo l'unione.

## What should happen

Nel worktree l'istruzione che esegue i Task di quella Proposal, a gruppi con `trama task next --batch`, è seguita da "Do not scan the whole System at the end: Trama checks the code after the merge.", e l'istruzione del worktree che dice di non scandire vince. Il controllo del codice è **una sola** scansione dopo l'unione riuscita.

## Chosen option

**Usare l'istruzione del worktree anche nel rilancio**

Il rilancio dopo la decisione su un Drift manda la stessa istruzione che segue la scansione nel worktree, con la frase che rimanda il controllo all'unione. Nessuna scansione dell'intero System nel worktree; modifica piccola, il Modello non cambia.

## Where in the code

extension/src/host/agent.ts: resumeWorktreeTasks (usa buildPrompt implement-design invece di buildWorktreeTasksPrompt)
