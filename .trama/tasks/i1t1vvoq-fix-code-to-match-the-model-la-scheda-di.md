---
column: done
technical: false
refs:
  - panel/Board
drift: vnm6f202
proposal: null
agent: false
created: 2026-10-17T13:42:06.727Z
finished: 2026-10-17T13:57:00.243Z
---
# Fix code to match the Model: La scheda di attesa scompare quando i Task che aspettano sono tutti presi dall'agente

## What happens

Quando il Task che corregge un Drift non è ancora Done e gli unici Task che lo aspettano sono presi dall'agente, la scheda di attesa sparisce da Blocked. Quei Task restano in Active con il badge `waiting`, ma nessuna scheda dice più che aspettano la correzione.

## What should happen

Il Modello dice che la scheda di attesa sparisce quando **nessun Task** aspetta più il Task di correzione. I Task presi dall'agente aspettano ancora: la scheda elenca sotto il titolo solo quelli che l'agente non ha preso.

## Chosen option

**Tenere la scheda anche senza righe**

La scheda di attesa resta in Blocked finché almeno un Task aspetta la correzione, anche se tutti sono presi: nessuna riga sotto il titolo, perché le righe sono solo i Task non presi. Costo: una scheda senza righe mentre l'agente lavora sui Task che aspettano.

## Where in the code

extension/src/webview/board/logic.ts, funzione buildBoard: underTask salta i Task presi (if (card.agent) continue) e la scheda di attesa esiste solo quando underTask ha una lista per il Task di correzione (riga 430).
