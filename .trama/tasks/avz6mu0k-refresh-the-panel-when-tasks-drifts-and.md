---
column: done
technical: false
refs:
  - panel/Open/workspace.MODEL_CHANGED
  - panel/Board
  - requirements/ui#panel/Board
  - requirements/tech#panel
drift: null
proposal: wibpfubx
agent: false
created: 2026-10-05T14:31:38.683Z
---
# Refresh the panel when Tasks, Drifts and Proposals inside the round's worktrees change

Finché il pannello è aperto, ogni cambiamento dei file deve portare, dopo la breve pausa, un quadro nuovo alle tre schede. Oggi il pannello segue solo i file della cartella aperta, mentre la Board mostra anche i Task e i Drift dei worktree del giro: quando l'agente di un worktree sposta un Task, lo prende o lo rilascia, o registra un Drift, la Board resta ferma al quadro vecchio finché non cambia qualcosa nella cartella aperta.

A lavoro finito, anche i cambiamenti ai Task, ai Drift e alle Proposal dentro i worktree del giro aggiornano il pannello con la stessa pausa e lo stesso comportamento in caso di errore di lettura.
