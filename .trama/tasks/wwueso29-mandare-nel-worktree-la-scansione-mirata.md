---
column: done
technical: false
refs:
  - worktree-round/In progress/terminal.COMMAND_ENDED
  - proposal/In worktree
  - requirements/rules#worktree-round
drift: null
proposal: rhfwtu3m
agent: false
created: 2026-10-06T10:45:27.748Z
---
# Mandare nel worktree la scansione mirata senza la catena e poi i Task a gruppi senza scan globale finale

Nel worktree di una Proposal l'agente riceve prima la stessa istruzione della scansione automatica mirata all'ambito di scansione di quella Proposal, con la frase che lega i Task a lei, ma sempre senza la parte che prosegue con l'implementazione, qualunque sia `trama.autoImplement`. Quando quel comando finisce e sono nati dei Task, nello stesso terminale arriva l'istruzione che esegue i Task di quella Proposal a gruppi con `trama task next --batch --proposal <id>`, seguita da "Do not scan the whole System at the end: Trama checks the code after the merge.", con la frase della lingua quando c'è. Il controllo dopo l'unione resta la scansione delle Feature toccate.
