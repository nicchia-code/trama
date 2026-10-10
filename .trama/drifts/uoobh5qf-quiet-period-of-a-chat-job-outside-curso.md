---
status: resolved
resolution: proposal
refs:
  - requirements/rules#drift-resolution
  - drift-resolution/Resolving/time.QUIET_PERIOD_ELAPSED
  - drift-resolution/Running tasks/time.QUIET_PERIOD_ELAPSED
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: l3o73qn6
created: 2026-10-09T23:28:00.513Z
---
# Quiet period of a chat job outside Cursor ignores the agent's reads and counts other commands

## What happens

Per un Run o un Resolve Drifts inviato alla chat di un editor che non è Cursor, Trama non sa riconoscere i comandi `trama` di quell'agente. Quindi:

- i comandi che **leggono soltanto**, eseguiti dall'agente della chat, non fanno ripartire la quiete: un agente che legge per quindici minuti è dato per finito;
- ogni comando che **cambia qualcosa**, eseguito dal developer o da un agente avviato senza Trama, fa ripartire la quiete di tutti i lavori di quella chat;
- con due Run nella chat, l'attività di uno tiene in corso anche l'altro, fermo da quindici minuti.

## What should happen

La quiete di un lavoro finisce dopo quindici minuti senza un comando `trama` **del suo agente** dalla chat, sia che cambi qualcosa sia che legga soltanto. È contata Run per Run: un Run fermo da quindici minuti è finito anche mentre altri continuano. Un agente avviato dal developer senza Trama non tocca Drift resolution, quindi i comandi del developer e di altri agenti non tengono in corso un Run o una risoluzione.

## Fix options

### Riconoscere i comandi dell'agente della chat

Trama dà ai comandi lanciati dalla chat dell'editor un segno proprio, come fa per Cursor e per i suoi terminali, e conta per la quiete solo quelli, letture comprese. Richiede di trovare un modo affidabile per marcare i comandi della chat di ogni editor, che potrebbe non esistere per tutti.

### Dire nei Requisiti che fuori da Cursor non si distingue

Il Requisito della quiete ammette che, nella chat di un editor senza hook, conta ogni comando che cambia qualcosa, chiunque lo esegua, e nessuna lettura, e che i lavori di quella chat condividono la quiete. Nessun codice cambia; si accetta che una risoluzione possa durare di più o finire prima.

### Contare anche le letture senza origine

Mentre è in corso un lavoro nella chat fuori da Cursor, anche i comandi che leggono soltanto senza terminale né chat noti fanno ripartire la sua quiete. Un agente che legge non è più dato per finito, ma le letture del developer tengono in corso il lavoro; serve comunque un Requisito che lo ammetta.

## Where in the code

`extension/src/host/drift-resolution.ts` (`noteActivity`), `src/cli/main.ts` (`reportActivity`)
