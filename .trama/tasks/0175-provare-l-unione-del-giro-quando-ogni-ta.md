---
column: done
technical: false
refs:
  - worktree-round/In progress/terminal.COMMAND_ENDED
  - worktree-round/Merging
  - worktree-round/Merging/worktree-round.MERGE_CLEAN
  - worktree-round/Merging/worktree-round.MERGE_CONFLICT
  - worktree-round.MERGED
  - proposal/In worktree/worktree-round.MERGED
  - agent-terminal/No agent terminal/proposal.APPROVED
  - agent-terminal/Agent running/proposal.APPROVED
  - agent-terminal/Agent idle/proposal.APPROVED
  - requirements/rules#worktree-round
  - requirements/rules#proposal/Approved
  - requirements/quality#worktree-round
  - requirements/tech#worktree-round
  - requirements/data#worktree-round
  - requirements/ui#worktree-round
drift: null
proposal: "0035"
agent: false
---
# Provare l'unione del giro quando ogni Task è in Done

Quando finisce un comando del giro e ogni Task delle Proposal ancora nel giro è in Done, Trama chiude i conti e prova l'unione in una cartella a parte. La cartella aperta non riceve mai i marcatori di conflitto.

Fatto quando:
- In ciascun worktree di Proposal Trama committa le modifiche rimaste con messaggio `Keep unfinished worktree changes`.
- L'unione si prova nel worktree sul branch `trama/merge`, cartella `<cartella padre>/<nome del repository>.trama-worktrees/merge`. Se quel branch esiste già, l'unione è rifiutata e il motivo è detto.
- Senza conflitti, se la cartella aperta non è il branch di partenza senza modifiche non committate, il giro aspetta: avvisa e non tocca nulla. I worktree restano.
- Senza conflitti e con la cartella già pronta, Trama aggiorna la cartella, elimina i worktree e fa sapere che il giro è unito. Le Proposal diventano parte del modello, le skill dei Requisiti sono rigenerate, e non parte la scansione di una singola accettazione: parte una sola scansione delle Feature che quelle Proposal avrebbero fatto scandire, senza duplicati e senza nominare una Proposal, con il launcher di sempre nella cartella aperta, solo dopo l'aggiornamento.
- Con i conflitti non entra nulla nel branch, i worktree restano e nasce il Merge Drift del giro.
- Una nuova accettazione mentre il giro unisce, riconcilia o aspetta è rifiutata.
