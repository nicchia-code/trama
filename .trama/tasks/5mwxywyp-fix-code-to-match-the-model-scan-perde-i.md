---
column: done
technical: false
refs:
  - announcement/Scanning
  - requirements/tech#announcement
drift: h6qk7874
proposal: null
agent: false
created: 2026-10-18T07:16:58.501Z
finished: 2026-10-18T07:24:09.843Z
---
# Fix code to match the Model: Scan perde il job

## What happens

Quando l'agente dichiara lo scan che Trama ha già annunciato al lancio, il controllo preso in carico perde il **lavoro** dello scan (il job che Trama ha avviato). Alla fine dello scan, l'esito, anche se fallito, non arriva all'editor: un controllo andato male non viene registrato nel coordinamento della delega, e la delega non sa com'è andato lo scan.

## What should happen

Un controllo tracciato conserva il legame con il suo lavoro quando l'agente lo prende in carico, e lo inoltra con il cambio di fase, la consegna e l'esito fallito: così la delega sa quando lo scan è finito e con quale esito.

## Chosen option

**Tenere il lavoro nella presa in carico**

Quando l'agente prende in carico il controllo annunciato da Trama al lancio, il controllo conserva il lavoro che l'agente indica o quello del suo terminale, come già fa un controllo annunciato direttamente. L'esito dello scan, anche fallito, arriva così all'editor. Costo: una modifica nella sola presa in carico; per il developer non cambia nulla.

## Where in the code

src/core/announcements.ts: nella presa in carico di un controllo di scan (`announce`) il lavoro indicato dall'agente non viene copiato sul controllo preso; extension/src/host/drift-resolution.ts: `receiveCheck` scarta un esito senza lavoro; src/cli/commands.ts: `announce done` inoltra il lavoro del controllo, che qui è vuoto.
