---
column: done
technical: false
refs:
  - announcement/Announced/terminal.COMMAND_ENDED
  - requirements/rules#announcement
drift: yljit2n1
proposal: null
agent: false
created: 2026-10-09T12:54:20.717Z
finished: 2026-10-09T18:38:33.557Z
---
# Fix code to match the Model: End of a hooked agent's command does not withdraw its terminal's announcements

## What happens

Quando l'agente del terminale ha un hook (omp), la **fine del comando** che Trama ha scritto, nel terminale integrato o nella finestra esterna, non ritira nulla: gli annunci di quel terminale restano finché l'hook non dice che l'agente è a riposo o il terminale non viene chiuso.

Poiché per questi annunci non vale nemmeno la quiete dei quindici minuti, un omp che termina senza che l'hook parli (ucciso, crash, hook non caricato) lascia il ghost sulla Board fino al riavvio dell'editor. Il codice segue la frase della Machine del terminale dell'agente secondo cui, con un hook, la fine del comando muove solo quella Machine.

## What should happen

La Transizione dell'Announcement su `terminal.COMMAND_ENDED` non fa eccezioni per gli agenti con un hook: la fine del comando che Trama ha scritto nel terminale a cui l'annuncio appartiene ritira subito ogni annuncio di quel terminale ancora in attesa, con l'avviso che l'agente ha finito senza consegnare.

L'unica eccezione che il Modello dà agli agenti con un hook riguarda i **quindici minuti di quiete**, non la fine del comando.

## Chosen option

**Withdraw at the end of the command also for hooked agents**

La fine del comando scritto da Trama ritira gli annunci del terminale anche quando l'agente ha un hook, con lo stesso avviso. Con omp il comando finisce solo quando omp esce, quindi nessun agente lavora più: non toglie ghost a un agente vivo e copre l'uscita senza hook. Run e Task presi restano come sono (altre Machine).

## Where in the code

`extension/src/host/agent.ts`: il gestore della fine dei comandi in `watchAgentTerminal` e `release` in `watchExternalRuns` escono subito quando `isHooked` è vero, prima di `withdrawWaiting`.
