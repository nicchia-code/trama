---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: null
proposal: ed96cc0b
agent: false
created: 1970-01-01T00:00:00.114Z
---
# Mostrare l'errore quando lo spostamento di un Task non riceve risposta

Quando lo spostamento di un Task chiesto dallo sviluppatore non riceve risposta prima del timeout, la scheda torna normale (come ora) e la Board mostra anche un errore, come per uno spostamento rifiutato. Oggi allo scadere il Task viene solo rilasciato dalla vista occupata, senza alcun messaggio.
