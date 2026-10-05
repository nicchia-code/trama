---
column: done
technical: false
refs:
  - worktree-round/In progress/workspace.WORKTREE_LOST
  - proposal/In worktree/workspace.WORKTREE_LOST
  - requirements/quality#worktree-round
drift: null
proposal: b4ce3d0d
agent: false
created: 1970-01-01T00:00:00.174Z
---
# Riportare da decidere una Proposal il cui worktree sparisce

Se un worktree di Proposal non c'è più prima dell'unione, quella Proposal torna da decidere e il developer è avvisato. Le altre continuano.

Fatto quando:
- Vale anche se a cancellarlo è la pulizia automatica dei worktree di Cursor.
- Se ne resta almeno uno, il giro continua e l'unione non include la Proposal persa.
- Se non ne resta nessuno, il giro non c'è più e il developer è avvisato lo stesso.
