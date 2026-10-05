---
status: approved
base:
  work/task.md: 5dbd6c8c3cc7aa369b6c3b20ef519d75a3b71fd442660f4e9efabd53613ecca1
  agent-launching/worktree-round.md: 4c2df5d0a8fcf7ad61a5c41e574b418469d1e8022f3dee4dd8343481bb5eb994
delete: []
created: 2026-10-05T15:00:10.736Z
---
# Il Task di correzione eredita il design del Task d'origine

Il developer ha deciso il Drift rh3dwa07 scegliendo l'opzione «Il Task di correzione eredita la Proposal»: dopo una decisione «correggi il codice» su un Drift di un worktree, il rilancio deve eseguire i Task della Proposal del giro, correzione compresa. Il Modello oggi dice che un Task che corregge un Drift non fa parte di alcun design, quindi il codice non può seguire quella scelta senza cambiare il Modello.

Scelte fatte senza intervista, da controllare:
- Il Task di correzione appartiene al design del Task da cui è nato il Drift, quando quel Task appartiene a un design; altrimenti, come oggi, a nessun design.
- Vale ovunque, non solo nei worktree, come dice l'opzione scelta.
- Un Task di correzione tecnico (Drift solo sui Requisiti) segue la stessa regola, anche se gli altri Technical Task restano fuori dai design: altrimenti nei worktree la correzione non partirebbe e il giro resterebbe fermo.
- Il rilancio dopo la decisione su un Drift di un worktree esegue i Task di quella Proposal.
