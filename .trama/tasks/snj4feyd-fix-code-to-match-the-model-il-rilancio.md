---
column: done
technical: false
refs:
  - worktree-round/In progress/developer.FIX_DRIFT_CODE
drift: rh3dwa07
proposal: null
agent: false
created: 2026-10-05T14:55:09.698Z
---
# Fix code to match the Model: Il rilancio dopo un Drift corretto nel codice in un worktree non trova il Task di correzione

## What happens

Dopo la decisione su un Drift di un worktree, Trama rilancia **tutti i Task in To do** del worktree, compresi i vecchi Task della cartella aperta copiati nel worktree.

Se il rilancio eseguisse solo i **Task della Proposal** (come chiede il Task), con la decisione «correggi il codice» non partirebbe nulla: il Task di correzione nasce senza Proposal, il Task d'origine aspetta lui, e il giro resterebbe fermo per sempre senza avvisi.

## What should happen

Il Modello dice che Trama «rilancia l'esecuzione dei **Task rimasti**», e che l'unione aspetta solo i Task delle Proposal del giro. Non dice se il Task di correzione di un Drift nato nel worktree appartiene alla Proposal del giro.

Senza questa scelta il rilancio o esegue anche il lavoro della cartella aperta, o non esegue la correzione. La scelta cambia cosa si vede sulla Board e cosa esegue l'agente.

## Chosen option

**Il Task di correzione eredita la Proposal**

Quando il Task d'origine del Drift appartiene a una Proposal, il Task di correzione appartiene alla stessa Proposal. Il rilancio esegue i Task di quella Proposal, la correzione compresa; l'unione aspetta anche lei; sulla Board il Task di correzione sta nella scheda di design. Cambia il Modello del Task e della decisione sul Drift, anche fuori dai worktree.

## Where in the code

extension/src/host/agent.ts (resumeWorktreeTasks); src/core/work.ts (resolveDrift, nextTask)
