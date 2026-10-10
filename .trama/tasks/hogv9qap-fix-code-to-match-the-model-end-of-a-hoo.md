---
column: done
technical: false
refs:
  - task/Taken by the agent/terminal.COMMAND_ENDED
  - requirements/tech#agent-hook
drift: x34ydbn2
proposal: null
agent: false
created: 2026-10-09T12:54:20.728Z
finished: 2026-10-09T18:38:58.488Z
---
# Fix code to match the Model: End of a hooked agent's command does not release its terminal's Tasks

## What happens

Quando l'agente del terminale ha un hook (omp), la **fine del comando** che Trama ha scritto, nel terminale integrato o nella finestra esterna, non rilascia i Task presi da quel terminale: restano In progress e presi finché l'hook non dice che l'agente è a riposo o il terminale integrato non viene chiuso.

Se omp esce senza che l'hook parli (ucciso, crash, hook non caricato), e soprattutto in una finestra esterna, che non segnala mai la chiusura, il Task resta preso finché il developer non lo riprende a mano. Il codice segue il Requisito `tech#agent-hook` e la frase della Machine del terminale dell'agente secondo cui, con un hook, la fine del comando muove solo quella Machine.

## What should happen

La Transizione del Task su `terminal.COMMAND_ENDED` non fa eccezioni per gli agenti con un hook: la fine del comando che Trama ha scritto nel terminale che aveva preso il Task lo rilascia subito e lo riporta in To do.

È la stessa differenza del Drift yljit2n1 per gli annunci, che lascia esplicitamente fuori i Task: conviene decidere i due insieme.

## Chosen option

**Release Tasks at the end of a hooked agent's command too**

La fine del comando scritto da Trama rilascia i Task del terminale anche quando l'agente ha un hook. Con omp il comando finisce solo quando omp esce, quindi nessun agente ci lavora più: non toglie Task a un agente vivo e copre l'uscita senza hook, anche nelle finestre esterne. Costo: il Requisito `tech#agent-hook` e la frase della Machine del terminale dell'agente vanno allineati.

## Where in the code

`extension/src/host/agent.ts`: il gestore della fine dei comandi in `watchAgentTerminal` e `release` in `watchExternalRuns` escono quando `isHooked` è vero, prima di rilasciare i Task.
