---
status: resolved
resolution: fix-code
refs:
  - agent-terminal
  - agent-terminal/Agent idle
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
proposal: null
task: f62nad0x
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:49:20.400Z
---
# Una nuova istruzione può riusare il terminale precedente

## What happens

Quando il comando precedente è finito e il terminale è ancora aperto, una nuova istruzione con lo stesso nome può essere scritta nello stesso terminale, purché progetto, posizione e canale delle domande coincidano. Il terminale conserva la sua identità, riceve un altro comando e viene seguito per una nuova corsa.

## What should happen

Ogni istruzione destinata a omp o Claude Code apre un terminale integrato nuovo, con un'identità propria. Un terminale a riposo lasciato aperto non è mai riusato, nemmeno per lo stesso lavoro, e non torna in Agent running. Il suo nome rimane quello fissato all'apertura.

## Fix options

### Aprire sempre un nuovo terminale

Ogni invio crea un terminale distinto e gli assegna una nuova identità, anche se quello precedente è libero e ha lo stesso nome. Il terminale a riposo resta disponibile al developer solo quando autoExit è spento. Non si mescolano conversazioni e corse; la riapertura aggiunge una scheda o una voce nell'elenco per ciascuna istruzione.

### Ammettere un nuovo ciclo nello stesso terminale

Rivedere la Machine per permettere il ritorno da Agent idle ad Agent running su una nuova istruzione, distinguendo ogni corsa dalla precedente. Conserva il riuso per lo stesso lavoro, ma cambia il ciclo di vita approvato e impone di definire come separare eventi tardivi, identità e conversazioni delle diverse corse.

## Where in the code

extension/src/host/agent.ts: launchAgent, lastTerminal, commandRunning
