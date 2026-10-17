---
status: resolved
resolution: fix-code
refs:
  - panel/Board
proposal: null
task: i1t1vvoq
origin: null
critical: false
option: 1
note: null
resolvedBy: rmrw5bde
created: 2026-10-17T13:35:23.027Z
---
# La scheda di attesa scompare quando i Task che aspettano sono tutti presi dall'agente

## What happens

Quando il Task che corregge un Drift non è ancora Done e gli unici Task che lo aspettano sono presi dall'agente, la scheda di attesa sparisce da Blocked. Quei Task restano in Active con il badge `waiting`, ma nessuna scheda dice più che aspettano la correzione.

## What should happen

Il Modello dice che la scheda di attesa sparisce quando **nessun Task** aspetta più il Task di correzione. I Task presi dall'agente aspettano ancora: la scheda elenca sotto il titolo solo quelli che l'agente non ha preso.

## Fix options

### Tenere la scheda anche senza righe

La scheda di attesa resta in Blocked finché almeno un Task aspetta la correzione, anche se tutti sono presi: nessuna riga sotto il titolo, perché le righe sono solo i Task non presi. Costo: una scheda senza righe mentre l'agente lavora sui Task che aspettano.

### Dire quanti Task aspettano, senza righe

La scheda resta finché aspetta almeno un Task e, sotto il titolo, scrive quanti Task aspettano la correzione e sono presi dall'agente, senza elencarli. Costo: una riga di testo in più, non prevista dal Modello, da scrivere come le altre diciture della scheda.

## Where in the code

extension/src/webview/board/logic.ts, funzione buildBoard: underTask salta i Task presi (if (card.agent) continue) e la scheda di attesa esiste solo quando underTask ha una lista per il Task di correzione (riga 430).
