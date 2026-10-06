---
status: approved
base:
  agent-launching/worktree-round.md: 2665d7efd34765c5144f93cf1101737373d06b7bf91d48ac6069f080b88ebb20
delete: []
created: 2026-10-06T14:23:49.223Z
scanScope:
  - ref: worktree-round/Conflict/workspace.WORKTREE_LOST
    reason: changed
  - ref: worktree-round/Reconciling/workspace.WORKTREE_LOST
    reason: changed
---
# Worktree sparito durante il conflitto o la riconciliazione del giro

Il codice gestisce già un worktree di Proposal che sparisce mentre il giro è in Conflict o in Reconciling: se il lavoro di quella Proposal non è ancora nell'unione, la Proposal torna aperta, il developer è avvisato e l'unione va avanti senza di lei. Se il suo lavoro è già nell'unione, non succede nulla. La Requirement quality#worktree-round lo chiede già ('prima dell'unione'), ma nel Diagram WORKTREE_LOST parte solo da In progress.

Scelte fatte senza intervista, da controllare:
- Aggiunte due Transitions su workspace.WORKTREE_LOST, una da Conflict e una da Reconciling, che restano nello stesso State: il giro non si chiude, perché il worktree di merge c'è ancora.
- Waiting e Merging restano senza Transition: in Waiting tutto il lavoro è già nell'unione, e Merging è un passaggio istantaneo.
- Nessuna Requirement cambia: quality#worktree-round copre già questo caso.
