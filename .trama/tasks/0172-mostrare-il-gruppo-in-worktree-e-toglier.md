---
column: done
technical: false
refs:
  - panel/Board
  - proposal/In worktree/developer.WITHDRAW_FROM_ROUND
  - worktree-round/In progress/developer.WITHDRAW_FROM_ROUND
  - requirements/ui#worktree-round
  - requirements/rules#proposal/In worktree
  - requirements/rules#worktree-round
drift: null
proposal: "0035"
agent: false
---
# Mostrare il gruppo In worktree e togliere una Proposal dal giro

Una Proposal nel worktree non è tra quelle da decidere. Sta in un gruppo a parte, e da lì si può togliere dal giro solo prima dell'unione.

Fatto quando:
- Sulla Board il gruppo si chiama `In worktree`. Ogni Proposal mostra il titolo e `Remove from round`, senza Approva né Rifiuta. Il pulsante c'è solo prima che l'unione cominci. La Proposal non conta tra quelle in attesa di decisione, né nel selettore del Diagramma né come modifica in attesa nei Requisiti.
- `trama board` elenca lo stesso gruppo, fuori da To decide.
- Toglierla elimina il suo worktree e la riporta aperta. Se ne restano altre il giro continua; se era l'ultima il giro non c'è più.
- Durante il conflitto, la riconciliazione o l'attesa non si può togliere una sola Proposal.
- Accettarla o rifiutarla di nuovo mentre è nel worktree è rifiutato, dicendo che è in un worktree.
