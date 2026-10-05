---
status: resolved
resolution: fix-code
refs:
  - worktree-round/In progress/developer.FIX_DRIFT_CODE
proposal: null
task: snj4feyd
origin: 8hn1a6tu
option: 1
note: null
created: 2026-10-05T14:48:32.553Z
---
# Il rilancio dopo un Drift corretto nel codice in un worktree non trova il Task di correzione

## What happens

Dopo la decisione su un Drift di un worktree, Trama rilancia **tutti i Task in To do** del worktree, compresi i vecchi Task della cartella aperta copiati nel worktree.

Se il rilancio eseguisse solo i **Task della Proposal** (come chiede il Task), con la decisione «correggi il codice» non partirebbe nulla: il Task di correzione nasce senza Proposal, il Task d'origine aspetta lui, e il giro resterebbe fermo per sempre senza avvisi.

## What should happen

Il Modello dice che Trama «rilancia l'esecuzione dei **Task rimasti**», e che l'unione aspetta solo i Task delle Proposal del giro. Non dice se il Task di correzione di un Drift nato nel worktree appartiene alla Proposal del giro.

Senza questa scelta il rilancio o esegue anche il lavoro della cartella aperta, o non esegue la correzione. La scelta cambia cosa si vede sulla Board e cosa esegue l'agente.

## Fix options

### Il Task di correzione eredita la Proposal

Quando il Task d'origine del Drift appartiene a una Proposal, il Task di correzione appartiene alla stessa Proposal. Il rilancio esegue i Task di quella Proposal, la correzione compresa; l'unione aspetta anche lei; sulla Board il Task di correzione sta nella scheda di design. Cambia il Modello del Task e della decisione sul Drift, anche fuori dai worktree.

### Rilanciare il lavoro nato nel worktree

Il rilancio esegue i Task in To do nati nel worktree (della Proposal e di correzione), lasciando fuori le copie della cartella aperta. Serve un'istruzione nuova all'agente e un filtro in `trama task next`; il Task di correzione resta fuori dalla scheda di design.

### Lasciare il rilancio di tutti i Task

Il rilancio continua a eseguire ogni Task in To do del worktree, copie comprese. Nessun cambio al codice, ma l'agente del worktree può lavorare su Task vecchi della cartella aperta; il Modello va precisato per dirlo.

## Where in the code

extension/src/host/agent.ts (resumeWorktreeTasks); src/core/work.ts (resolveDrift, nextTask)
