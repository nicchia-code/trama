---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: null
proposal: wibpfubx
agent: false
created: 2026-10-05T14:31:38.863Z
---
# Make the blocked and waiting badges of worktree Tasks lead to what blocks them

Sulla Board il badge `blocked` porta al Drift che blocca il Task e il badge `waiting` alla scheda del Task di correzione che aspetta. Per i Task di un worktree del giro oggi non funziona: `waiting` non trova la scheda del Task di correzione nato nel worktree, e `blocked` apre il Diagramma, che non disegna i Drift dei worktree, senza selezionare nulla.

A lavoro finito il developer arriva sempre al motivo del blocco: `waiting` scorre fino alla scheda del Task di correzione anche quando è in un worktree e le dà il focus; `blocked` per un Drift di un worktree porta alla sua scheda in To decide sulla Board, con scorrimento e focus. Per i Drift della cartella aperta resta il Diagramma.
