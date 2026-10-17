---
column: done
technical: true
refs:
  - requirements/ui#announcement
drift: null
proposal: dk0grfyg
agent: false
created: 2026-10-17T10:26:29.439Z
finished: 2026-10-17T10:35:47.599Z
---
# Disegno dei ghost in fondo ad Active

Quando il Task è finito, la webview della Board disegna ogni ghost (Proposal, Drift, Task e controllo) nella colonna `Active`, in fondo, dopo le schede dei Task, qualunque sia la colonna in cui arriverà la scheda vera. Più ghost conservano l'ordine in cui sono stati annunciati, qualunque sia il loro tipo, controlli compresi. Quando la scheda vera arriva, il ghost sparisce da `Active` e la scheda compare nella sua colonna (`Backlog`, `Blocked` o `Active`) al suo posto nell'ordine di creazione.

Restano come sono lo scheletro (bordo tratteggiato, traslucido, shimmer fermato con reduced motion), le righe di tipo, titolo e fase (`Preparing`, `Writing`, `Waiting for your answers`; per un controllo `Check` con `Verifying (tests, lint, build)` o `Scanning`), i nomi accessibili, l'esclusione dai conteggi delle colonne e del tab Board, gli avvisi `The agent finished without delivering <kind> <title>.` e `The agent stopped before finishing <title>.` in cima alla Board, e il disegno anche con un altro tab aperto.

Va tolto il codice che metteva i ghost in Work Items, Ready o In progress secondo il tipo. I requisiti sui ghost ora stanno nel frammento `requirements/ui/ghosts.md` (separato da `ui/board.md`); aggiornare i test della webview che verificano la posizione dei ghost.
