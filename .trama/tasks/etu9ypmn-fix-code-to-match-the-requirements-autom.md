---
column: done
technical: true
refs:
  - requirements/tech#agent-terminal
drift: 6yjh5zaq
proposal: null
agent: false
created: 2026-10-14T08:44:28.422Z
finished: 2026-10-14T08:49:15.345Z
---
# Fix code to match the Requirements: Automatic instructions in Cursor's chat stop at the first step

## What happens

Quando la chat di Cursor non invia da sola un'istruzione automatica (la risoluzione dei Drift o il Run automatico), Trama si ferma lì: non propone il collegamento che aspetta l'Invio del developer e non copia nulla negli appunti. Il flusso automatico resta in pausa con un avviso che il passo non è arrivato all'agente. Per le istruzioni scritte dal developer, invece, la chat prova il collegamento e poi gli appunti.

## What should happen

Il Requisito di `tech#agent-terminal` dice che la chat di Cursor prova i passi in ordine e passa al successivo se un passo manca o fallisce, fino agli appunti con l'avviso. Ogni istruzione dovrebbe avere la stessa catena, anche quella automatica. Il Modello dice che un'istruzione che resta pronta o negli appunti non lancia nulla: quindi un flusso automatico può aspettare il developer, ma non dovrebbe fermarsi senza aver provato il passo successivo.

## Chosen option

**Stop automatic instructions at the first step and say so in the Requirement**

Le istruzioni automatiche provano solo il primo passo, come oggi: se Cursor non invia da sé, nulla parte e il flusso automatico si ferma con l'avviso che il passo è in pausa. Nessuna conferma resta in attesa in chat, e l'autopilota non dipende da un Invio. Costo: il Requisito va riscritto per dire che il ripiego vale solo per le istruzioni del developer, e su Cursor l'autopilota si ferma più spesso.

## Where in the code

extension/src/host/cursor.ts (openCursorChat); extension/src/host/agent.ts (launchAgent); extension/src/host/controller.ts (le due consegne automatiche)
