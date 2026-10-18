---
status: resolved
resolution: fix-code
refs:
  - announcement/Scanning
  - requirements/tech#announcement
proposal: null
task: 5mwxywyp
origin: null
critical: false
option: 1
note: null
resolvedBy: uzhgg4na
created: 2026-10-18T07:13:57.018Z
---
# Scan perde il job

## What happens

Quando l'agente dichiara lo scan che Trama ha già annunciato al lancio, il controllo preso in carico perde il **lavoro** dello scan (il job che Trama ha avviato). Alla fine dello scan, l'esito, anche se fallito, non arriva all'editor: un controllo andato male non viene registrato nel coordinamento della delega, e la delega non sa com'è andato lo scan.

## What should happen

Un controllo tracciato conserva il legame con il suo lavoro quando l'agente lo prende in carico, e lo inoltra con il cambio di fase, la consegna e l'esito fallito: così la delega sa quando lo scan è finito e con quale esito.

## Fix options

### Tenere il lavoro nella presa in carico

Quando l'agente prende in carico il controllo annunciato da Trama al lancio, il controllo conserva il lavoro che l'agente indica o quello del suo terminale, come già fa un controllo annunciato direttamente. L'esito dello scan, anche fallito, arriva così all'editor. Costo: una modifica nella sola presa in carico; per il developer non cambia nulla.

### Legare il lavoro già al lancio

Trama annuncia il controllo di uno scan già con il lavoro che lancia, così il legame esiste dal primo istante anche se l'agente non lo indica, e la presa in carico non lo tocca. Costo: il lancio deve conoscere il lavoro prima che l'istruzione parta, e un controllo annunciato dall'agente senza lancio resta com'è oggi.

## Where in the code

src/core/announcements.ts: nella presa in carico di un controllo di scan (`announce`) il lavoro indicato dall'agente non viene copiato sul controllo preso; extension/src/host/drift-resolution.ts: `receiveCheck` scarta un esito senza lavoro; src/cli/commands.ts: `announce done` inoltra il lavoro del controllo, che qui è vuoto.
