---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#agent-terminal
proposal: null
task: etu9ypmn
origin: null
critical: false
option: 1
note: null
resolvedBy: 7rgcnw9t
created: 2026-10-14T08:42:10.473Z
---
# Automatic instructions in Cursor's chat stop at the first step

## What happens

Quando la chat di Cursor non invia da sola un'istruzione automatica (la risoluzione dei Drift o il Run automatico), Trama si ferma lì: non propone il collegamento che aspetta l'Invio del developer e non copia nulla negli appunti. Il flusso automatico resta in pausa con un avviso che il passo non è arrivato all'agente. Per le istruzioni scritte dal developer, invece, la chat prova il collegamento e poi gli appunti.

## What should happen

Il Requisito di `tech#agent-terminal` dice che la chat di Cursor prova i passi in ordine e passa al successivo se un passo manca o fallisce, fino agli appunti con l'avviso. Ogni istruzione dovrebbe avere la stessa catena, anche quella automatica. Il Modello dice che un'istruzione che resta pronta o negli appunti non lancia nulla: quindi un flusso automatico può aspettare il developer, ma non dovrebbe fermarsi senza aver provato il passo successivo.

## Fix options

### Stop automatic instructions at the first step and say so in the Requirement

Le istruzioni automatiche provano solo il primo passo, come oggi: se Cursor non invia da sé, nulla parte e il flusso automatico si ferma con l'avviso che il passo è in pausa. Nessuna conferma resta in attesa in chat, e l'autopilota non dipende da un Invio. Costo: il Requisito va riscritto per dire che il ripiego vale solo per le istruzioni del developer, e su Cursor l'autopilota si ferma più spesso.

### Follow the whole chain for automatic instructions too

Le istruzioni automatiche provano anche il collegamento e gli appunti, come quelle del developer. Il collegamento apre la conferma di Cursor: il passo automatico parte solo quando il developer preme Invio, e il flusso resta in pausa fino ad allora. Gli appunti avvisano di incollare. Costo: anche con l'autopilota acceso, la risoluzione o il Run automatico può aspettare una persona, e il developer deve ricordarsi di confermare.

## Where in the code

extension/src/host/cursor.ts (openCursorChat); extension/src/host/agent.ts (launchAgent); extension/src/host/controller.ts (le due consegne automatiche)
