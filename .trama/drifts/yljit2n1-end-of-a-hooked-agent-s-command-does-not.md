---
status: resolved
resolution: fix-code
refs:
  - announcement/Announced/terminal.COMMAND_ENDED
  - requirements/rules#announcement
proposal: null
task: jldpx118
origin: null
option: 1
note: null
resolvedBy: sjsoc8fq
created: 2026-10-09T12:29:33.940Z
---
# End of a hooked agent's command does not withdraw its terminal's announcements

## What happens

Quando l'agente del terminale ha un hook (omp), la **fine del comando** che Trama ha scritto, nel terminale integrato o nella finestra esterna, non ritira nulla: gli annunci di quel terminale restano finché l'hook non dice che l'agente è a riposo o il terminale non viene chiuso.

Poiché per questi annunci non vale nemmeno la quiete dei quindici minuti, un omp che termina senza che l'hook parli (ucciso, crash, hook non caricato) lascia il ghost sulla Board fino al riavvio dell'editor. Il codice segue la frase della Machine del terminale dell'agente secondo cui, con un hook, la fine del comando muove solo quella Machine.

## What should happen

La Transizione dell'Announcement su `terminal.COMMAND_ENDED` non fa eccezioni per gli agenti con un hook: la fine del comando che Trama ha scritto nel terminale a cui l'annuncio appartiene ritira subito ogni annuncio di quel terminale ancora in attesa, con l'avviso che l'agente ha finito senza consegnare.

L'unica eccezione che il Modello dà agli agenti con un hook riguarda i **quindici minuti di quiete**, non la fine del comando.

## Fix options

### Withdraw at the end of the command also for hooked agents

La fine del comando scritto da Trama ritira gli annunci del terminale anche quando l'agente ha un hook, con lo stesso avviso. Con omp il comando finisce solo quando omp esce, quindi nessun agente lavora più: non toglie ghost a un agente vivo e copre l'uscita senza hook. Run e Task presi restano come sono (altre Machine).

### Keep the code and exempt hooked agents in the Model

Il comportamento resta: con un hook contano solo l'hook e la chiusura del terminale. Si aggiunge alla Transizione `terminal.COMMAND_ENDED` dell'Announcement l'eccezione per gli agenti con un hook, come già per la quiete. Costo: un omp ucciso senza hook lascia il ghost fino al riavvio dell'editor.

## Where in the code

`extension/src/host/agent.ts`: il gestore della fine dei comandi in `watchAgentTerminal` e `release` in `watchExternalRuns` escono subito quando `isHooked` è vero, prima di `withdrawWaiting`.
