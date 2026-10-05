---
column: done
technical: false
refs:
  - worktree-round/Waiting
  - worktree-round/Waiting/workspace.TREE_READY
  - worktree-round/Merging/worktree-round.MERGE_CLEAN
  - worktree-round.MERGED
  - proposal/In worktree/worktree-round.MERGED
  - agent-terminal/No agent terminal/proposal.APPROVED
  - agent-terminal/Agent running/proposal.APPROVED
  - agent-terminal/Agent idle/proposal.APPROVED
  - requirements/rules#worktree-round
  - requirements/rules#proposal/Approved
  - requirements/ui#worktree-round
  - requirements/quality#worktree-round
  - requirements/data#worktree-round
drift: null
proposal: "0035"
agent: false
---
# Applicare l'unione quando la cartella aperta è di nuovo pronta

Se l'unione non ha conflitti ma la cartella aperta non è il branch di partenza senza modifiche non committate, Trama aspetta. Quando la cartella è pronta, applica l'unione e fa il controllo una volta sola.

Fatto quando:
- L'avviso è `Trama has a merge ready. It will update this folder when you are back on <branch> with a clean tree.` I worktree restano.
- Quando la cartella è di nuovo quel branch, pulita, Trama la aggiorna, elimina i worktree e fa sapere che il giro è unito.
- Le Proposal diventano parte del modello e le skill dei Requisiti sono rigenerate. Non parte la scansione che segue di solito una singola accettazione.
- Parte una sola scansione, con il launcher abituale nella cartella aperta, delle Feature che le Proposal unite avrebbero fatto scandire, senza duplicati e senza nominare una Proposal, solo dopo l'aggiornamento. I Task di quel controllo non appartengono a nessuna Proposal.
- Il Merge Drift e il suo Task non entrano nel risultato. Se l'agente li ha committati, Trama li toglie prima di applicare l'unione.
